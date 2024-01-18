import { AoriHttpProvider, AoriMempoolProvider } from "../providers";
import { DetailsToExecute } from "../utils";

export class MempoolExecutor extends AoriHttpProvider {
    async initialise({ onOrderToExecute }: {
        onOrderToExecute: (data: { executor: MempoolExecutor, details: DetailsToExecute }) => void
    }): Promise<void> {
        const mempoolProvider = new AoriMempoolProvider();

        console.log("Initialising mempool executor...");

        setInterval(async () => {
            console.log(`Checking for outstanding matches...`);
            const outstandingMatches = await mempoolProvider.outstandingMatches(this.wallet.address);
            console.log(`Found ${outstandingMatches.length} outstanding matches...`);
            outstandingMatches.forEach((details) => onOrderToExecute({ executor: this, details }));
        }, 5_000);
    }
}