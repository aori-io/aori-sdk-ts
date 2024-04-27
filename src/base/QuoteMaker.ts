import { parseEther, Wallet } from "ethers";
import { getFeeData } from "../providers";
import { ERC20__factory } from "../types";
import { SubscriptionEvents } from "../utils";
import { BaseMaker } from "./BaseMaker";
import { Quoter } from "../adapters";

export function QuoteMaker({
    wallet,
    apiUrl,
    feedUrl,
    takerUrl,
    apiKey,
    vaultContract,
    spreadPercentage = 0n,
    defaultChainId,
    cancelAfter = 12_000,
    cancelAllFirst = false,
    quoter,
    sponsorGas = true,
    gasLimit = 5_000_000n,
    generatePassiveQuotes,
    settleTx
}:  ConstructorParameters<typeof BaseMaker>[0] & {
    spreadPercentage?: bigint;
    cancelAfter?: number;
    cancelAllFirst?: boolean;
    quoter: Quoter;
    generatePassiveQuotes?: { generateEveryMs: number, quotes: { inputToken: string, inputAmount: string, outputToken: string, chainId: number }[] },
    gasLimit?: bigint;
    sponsorGas?: boolean;
    settleTx?: boolean;
}) {
    const baseMaker = new BaseMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        vaultContract,
        apiKey,
        defaultChainId
    });

    baseMaker.on("ready", () => {
        baseMaker.initialise({ cancelAllFirst });
        baseMaker.subscribe();

        async function generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId }: { inputToken: string, inputAmount: string, outputToken: string, chainId: number }) {
            const { outputAmount, to: quoterTo, value: quoterValue, data: quoterData } = await quoter.getOutputAmountQuote({
                inputToken,
                outputToken,
                inputAmount,
                fromAddress: baseMaker.vaultContract || baseMaker.wallet.address,
                chainId
            });

            // Construct preCalldata
            const preCalldata = [];
            if (quoterTo != baseMaker.vaultContract && quoterTo != baseMaker.wallet.address && quoterTo != "") {

                // Approve quoter
                if (await baseMaker.dataProvider.getTokenAllowance({
                    chainId: baseMaker.defaultChainId,
                    address: baseMaker.vaultContract || baseMaker.wallet.address,
                    spender: quoterTo,
                    token: inputToken
                }) < BigInt(inputAmount)) {
                    console.log(`✍️ Approving ${quoterTo} for ${baseMaker.vaultContract || baseMaker.wallet.address} on chain ${baseMaker.defaultChainId}`);
                    preCalldata.push({
                        to: inputToken,
                        value: 0,
                        data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                            quoterTo, parseEther("100000")
                        ])
                    });
                } else {
                    console.log(`☑️ Already approved ${quoterTo} for ${baseMaker.vaultContract || baseMaker.wallet.address} on chain ${baseMaker.defaultChainId}`);
                }

                // Perform swap
                preCalldata.push({
                    to: quoterTo,
                    value: quoterValue,
                    data: quoterData
                });
            }

            if (outputAmount == 0n) {
                console.log(`✍️ Quote for ${inputToken} -> ${outputToken} is 0`);
                return;
            }

            try {
                const { gasPrice } = await getFeeData(chainId);
                const gasInToken = (sponsorGas) ? 0n : await baseMaker.pricingProvider.calculateGasInToken({
                    chainId,
                    gas: Number((BigInt(gasLimit) * BigInt(gasPrice)).toString()),
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

        baseMaker.feed.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
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