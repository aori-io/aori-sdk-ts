import { AoriHttpProvider, SubscriptionEvents } from "../providers";

export class SponsorBot extends AoriHttpProvider {
    async initialise({ getGasData }: {
        getGasData: ({ to, value, data, chainId }:
            { to: string, value: number, data: string, chainId: number })
            => Promise<{ gasPrice: bigint, gasLimit: bigint }>
    }): Promise<void> {
        console.log("Initialising sponsor bot...");

        this.on(SubscriptionEvents.OrderToExecute, async ({ makerOrderHash, takerOrderHash, to, value, data, chainId }) => {
            console.log(`📦 Received an Order-To-Execute:`, { makerOrderHash, takerOrderHash, to, value, data, chainId });
            const { gasPrice, gasLimit } = await getGasData({ to, value, data, chainId });

            try {
                await this.wallet.call({
                    to,
                    value,
                    data,
                    gasPrice,
                    gasLimit,
                    chainId
                });

                const response = await this.sendTransaction({
                    to,
                    value,
                    data,
                    gasPrice,
                    gasLimit,
                    chainId,
                    nonce: await this.getNonce()
                });
                console.log(`Sent transaction: `, response);
            } catch (e: any) {
                console.log(e);
            }
        })
    }
}