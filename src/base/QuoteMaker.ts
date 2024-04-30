import { parseEther, Wallet } from "ethers";
import { getFeeData, getTokenAllowance } from "../providers";
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
    cancelAfter = 30_000,
    cancelAllFirst = false,
    quoter,
    sponsorGas = false,
    gasLimit = 5_000_000n,
    settleTx
}:  ConstructorParameters<typeof BaseMaker>[0] & Parameters<BaseMaker["initialise"]>[0] & {
    spreadPercentage?: bigint;
    cancelAfter?: number;
    quoter: Quoter;
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
                preCalldata.push({
                    to: inputToken,
                    value: 0,
                    data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                        quoterTo, parseEther("100000")
                    ])
                });

                // Perform swap
                preCalldata.push({ to: quoterTo, value: quoterValue, data: quoterData });
            }

            if (outputAmount == 0n) {
                console.log(`✍️ Quote for ${inputToken} -> ${outputToken} is 0`);
                return;
            }

            try {
                let gasInToken = 0n;
                if (sponsorGas) {
                    const { gasPrice } = await getFeeData(chainId);
                    gasInToken = await baseMaker.pricingProvider.calculateGasInToken({
                        chainId,
                        gas: Number((BigInt(gasLimit) * BigInt(gasPrice)).toString()),
                        token: inputToken
                    });
                }

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
        }

        baseMaker.feed.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
            if (chainId == baseMaker.defaultChainId) {
                if (inputAmount == undefined || inputAmount == "0") return;
                await generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId });
            }
        });
    });

    return baseMaker;
}