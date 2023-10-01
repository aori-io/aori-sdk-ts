import { Wallet } from "ethers";
import { NotificationEvents } from "../providers";
import { LimitOrderManager } from "./LimitOrderManager";

export class FromInventoryExecutor extends LimitOrderManager {
    async initialise(...any: any[]): Promise<void> {
        super.initialise();

        this.on(NotificationEvents.OrderToExecute, async ({ contractCall }) => {
            if (this.wallet.provider == null) this.wallet = new Wallet(this.wallet.privateKey, this.provider);
            await this.wallet.sendTransaction(contractCall);
        });
    }
}