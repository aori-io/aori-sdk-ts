import { NotificationEvents, SubscriptionEvents } from "../providers";
import { SingleSidedMaker } from "./SingleSidedMaker";

export class SingleSidedQuoter extends SingleSidedMaker {

    async initialise({ chainId, inputToken, outputToken, intervalInMs }: { chainId: number; inputToken: string; outputToken: string; intervalInMs: number }): Promise<void> {
        super.initialise({ chainId, inputToken, outputToken });

        if (intervalInMs > 0) {
            setInterval(() => {
                this.refreshOrders();
            }, intervalInMs);
        }

        this.on(NotificationEvents.QuoteRequested, ({ inputToken, inputAmount, outputToken, outputAmount }) => {
            if (inputToken === this.inputToken && outputToken === this.outputToken) {
                this.refreshOrders();
            }
        });

        this.on(SubscriptionEvents.OrderTaken, ({ inputToken, inputAmount, outputToken, outputAmount, orderHash }) => {
            if (inputToken === this.inputToken && outputToken === this.outputToken) {
                this.refreshOrders();
            }
        });
    }

    // Abstract
    async refreshOrders() { }
}