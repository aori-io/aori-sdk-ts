import { Quoter } from "@aori-io/adapters";
import { Wallet } from "ethers";
import { SubscriptionEvents } from "../providers";
import { FlashMaker } from "./FlashMaker";

export function QMaker({
    wallet,
    apiUrl,
    feedUrl,
    takerUrl,
    apiKey,
    aoriVaultContract,
    spreadPercentage,
    chainId,
    cancelAfter,
    retryCount = 1,
    quoter,
    getGasData
}: {
    wallet: Wallet;
    apiUrl: string;
    feedUrl: string;
    takerUrl?: string;
    apiKey: string;
    aoriVaultContract: string;
    spreadPercentage: bigint;
    chainId: number;
    cancelAfter: number;
    retryCount?: number;
    quoter: Quoter;
    getGasData: ({ to, value, data, chainId }:
        { to: string, value: number, data: string, chainId: number })
        => Promise<{ gasPrice: bigint, gasLimit: bigint }>
}) {
    const qm = new FlashMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        vaultContract: aoriVaultContract,
        apiKey,
        defaultChainId: chainId
    });

    qm.on("ready", () => {
        qm.initialise({ getGasData, cancelAllFirst: true });
        qm.subscribe();

        qm.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
            if (chainId == qm.defaultChainId) {
                if (inputAmount == undefined) return;

                for (let i = 0; i < retryCount; i++) {
                    try {
                        await qm.generateQuoteOrder({
                            inputToken,
                            outputToken,
                            outputAmount: BigInt(inputAmount),
                            spreadPercentage,
                            quoter,
                            cancelAfter
                        });
                        return;
                    } catch (e: any) {
                        console.log(e);
                    }

                    // Wait some seconds before trying again
                    await new Promise((resolve) => setTimeout(resolve, cancelAfter));
                }
            }
        })
    })

    return qm;
}