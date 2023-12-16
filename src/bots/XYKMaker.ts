import { Wallet } from "ethers";
import { QuoteMaker } from "./QuoteMaker";

export function XYKMaker({
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
    getGasData

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
    getGasData: ({ to, value, data, chainId }: { to: string, value: number, data: string, chainId: number }) => Promise<{ gasPrice: bigint, gasLimit: bigint }>
}) {
    const xykMaker = QuoteMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        aoriVaultContract: aoriVaultContract,
        spreadPercentage,
        apiKey,
        chainId,
        cancelAfter,
        cancelAllFirst,
        quoter: {
            name: () => "XYKMaker",
            getOutputAmountQuote: async ({ inputToken, outputToken, inputAmount, fromAddress, chainId }) => {

                const inputBalance = await xykMaker.dataProvider.getTokenBalance({
                    token: inputToken,
                    address: aoriVaultContract,
                    chainId
                });

                const outputBalance = await xykMaker.dataProvider.getTokenBalance({
                    token: outputToken,
                    address: aoriVaultContract,
                    chainId
                });

                const newOutputAmount = (BigInt(inputBalance) * BigInt(outputBalance)) / (inputBalance - BigInt(inputAmount));

                return { outputAmount: newOutputAmount - outputBalance, to: "", value: 0, data: "", price: 0 }
            },
            getInputAmountQuote: async ({ inputToken, outputToken, outputAmount, fromAddress, chainId }) => {

                const inputBalance = await xykMaker.dataProvider.getTokenBalance({
                    token: inputToken,
                    address: aoriVaultContract,
                    chainId
                });

                const outputBalance = await xykMaker.dataProvider.getTokenBalance({
                    token: outputToken,
                    address: aoriVaultContract,
                    chainId
                });

                const newInputAmount = (BigInt(inputBalance) * BigInt(outputBalance)) / (outputBalance - BigInt(outputAmount));

                return { outputAmount: newInputAmount - inputBalance, to: "", value: 0, data: "", price: 0 }
            }
        },
        getGasData
    });

    return xykMaker;
}