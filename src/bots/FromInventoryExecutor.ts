import { SubscriptionEvents } from "../providers";
import { LimitOrderManager } from "./LimitOrderManager";

export class FromInventoryExecutor extends LimitOrderManager {
    async initialise(...any: any[]): Promise<void> {
        super.initialise();

        this.on(SubscriptionEvents.OrderToExecute, async ({ to, value, data }) => {
            await this.sendTransaction({ to, value, data });
        });
    }
}