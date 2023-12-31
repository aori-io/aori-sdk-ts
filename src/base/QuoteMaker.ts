import { Quoter } from "@aori-io/adapters";
import { Wallet } from "ethers";
import { SubscriptionEvents } from "../providers";
import { BaseMaker } from "./BaseMaker";

export function QuoteMaker({
    wallet,
    apiUrl,
    feedUrl,
    takerUrl,
    apiKey,
    aoriVaultContract,
    spreadPercentage = 0n,
    chainId,
    cancelAfter = 12_000,
    cancelAllFirst = false,
    quoter,
    getGasData,
    sponsorGas = true,
    generatePassiveQuotes,
    settleTx
}: {
    wallet: Wallet;
    apiUrl: string;
    feedUrl: string;
    takerUrl?: string;
    apiKey: string;
    aoriVaultContract: string;
    spreadPercentage?: bigint;
    chainId: number;
    cancelAfter?: number;
    cancelAllFirst?: boolean;
    quoter: Quoter;
    getGasData: ({ to, value, data, chainId }: { to: string, value: number, data: string, chainId: number }) => Promise<{ gasPrice: bigint, gasLimit: bigint }>,
    generatePassiveQuotes?: { generateEveryMs: number, quotes: { inputToken: string, inputAmount: string, outputToken: string, chainId: number }[] },
    sponsorGas?: boolean;
    settleTx?: boolean;
}) {
    const baseMaker = new BaseMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        vaultContract: aoriVaultContract,
        apiKey,
        defaultChainId: chainId
    });

    baseMaker.on("ready", () => {
        baseMaker.initialise({ getGasData, cancelAllFirst });
        baseMaker.subscribe();

        async function generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId }: { inputToken: string, inputAmount: string, outputToken: string, chainId: number }) {
            const { outputAmount, to: quoterTo, value: quoterValue, data: quoterData } = await quoter.getOutputAmountQuote({
                inputToken,
                outputToken,
                inputAmount,
                fromAddress: baseMaker.vaultContract || "",
                chainId
            });

            // Construct preCalldata
            const preCalldata = [];
            if (quoterTo != baseMaker.vaultContract || quoterTo != "") {
                preCalldata.push({
                    to: quoterTo,
                    value: quoterValue,
                    data: quoterData
                });
            }

            try {

                const { gasLimit, gasPrice } = await getGasData({
                    // TODO: Make more accurate
                    to: baseMaker.vaultContract || "",
                    value: 0,
                    data: "0x",
                    chainId
                });

                const gasInToken = (sponsorGas) ? 0n : await baseMaker.pricingProvider.calculateGasInToken({
                    chainId,
                    gas: Number(gasLimit * gasPrice),
                    token: inputToken
                });

                await baseMaker.generateQuoteOrder({
                    inputToken,
                    outputToken,
                    inputAmount: (outputAmount - gasInToken) * (10_000n - spreadPercentage) / 10_000n,
                    outputAmount: BigInt(inputAmount),
                    cancelAfter,
                    preCalldata,
                    settleTx
                });
                return;
            } catch (e: any) {
                console.log(e);
            }

            // Wait some seconds before trying again
            await new Promise((resolve) => setTimeout(resolve, cancelAfter));
        }

        baseMaker.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
            if (chainId == baseMaker.defaultChainId) {
                if (inputAmount == undefined) return;
                await generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId });
            }
        });

        if (generatePassiveQuotes != undefined) {
            const { generateEveryMs, quotes } = generatePassiveQuotes;

            // initial
            for (const { inputToken, inputAmount, outputToken, chainId } of quotes) {
                generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId });
            }

            // every generateEveryMs
            setInterval(async () => {
                for (const { inputToken, inputAmount, outputToken, chainId } of quotes) {
                    await generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId });
                }
            }, generateEveryMs);
        }
    });

    return baseMaker;
}

