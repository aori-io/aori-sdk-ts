import { AoriProvider, OrderView, SubscriptionEvents } from "../providers";

export class OrderbookListener extends AoriProvider {
    currentLimitOrders: {
        [tokenA: string]: {
            [tokenB: string]: string[] // orderHash
        }
    } = {};

    limitOrders: { [orderHash: string]: OrderView } = {};

    async initialise(): Promise<void> {
        super.initialise();

        // Order Created
        this.on(SubscriptionEvents.OrderCreated, async (orderDetails) => {
            const { inputToken, outputToken } = orderDetails;

            if (!this.currentLimitOrders[inputToken]) this.currentLimitOrders[inputToken] = {};
            if (!this.currentLimitOrders[inputToken][outputToken]) this.currentLimitOrders[inputToken][outputToken] = [];
            if (orderDetails.orderHash in this.limitOrders) return;

            this.limitOrders[orderDetails.orderHash] = orderDetails;
            this.currentLimitOrders[inputToken][outputToken].push(orderDetails.orderHash);
        });

        // Order Cancelled
        this.on(SubscriptionEvents.OrderCancelled, async ({ orderHash }) => {
            delete this.limitOrders[orderHash];
        });

        // Order Taken
        this.on(SubscriptionEvents.OrderTaken, async ({ orderHash }) => {
            delete this.limitOrders[orderHash];
        });
    }
}