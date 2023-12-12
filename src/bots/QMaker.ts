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
    quoter
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
    quoter: Quoter
}) {
    const qm = new FlashMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        apiKey,
        defaultChainId: chainId
    });

    qm.on("ready", () => {
        qm.initialise({ aoriVaultContract });
        qm.subscribe();

        qm.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
            if (chainId == qm.defaultChainId) {
                if (inputAmount == undefined) return;

                try {
                    await qm.generateQuoteOrder({
                        inputToken: outputToken,
                        outputToken: inputToken,
                        outputAmount: BigInt(inputAmount),
                        spreadPercentage,
                        quoter,
                        cancelAfter
                    });
                } catch (e: any) {
                    console.log(e);
                }
            }
        })
    })

    return qm;
}