import { NotificationEvents } from "../providers";
import { LimitOrderManager } from "./LimitOrderManager";

export class FromInventoryExecutor extends LimitOrderManager {
    async initialise(...any: any[]): Promise<void> {
        super.initialise();

        this.on(NotificationEvents.OrderToExecute, async ({ to, value, data }) => {
            await this.sendTransaction({ to, value, data });
        });
    }
}