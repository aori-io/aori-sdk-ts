import { getTokenBalance } from "../../providers";
import { Quoter } from "../Quoter";

export const xykQuoterFactory: ((address: string, chainId?: number, tokenA?: string, tokenB?: string) => Quoter) = (address, chainId, tokenA, tokenB) => ({
    name: () => "XYKMaker",
    getOutputAmountQuote: async ({ inputToken, outputToken, inputAmount, chainId: _chainId }) => {

        if (tokenA != undefined && tokenB != undefined && (tokenA != inputToken && tokenB != outputToken) || (tokenB != inputToken && tokenA != outputToken) || (chainId != undefined && chainId != _chainId)) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: 0n,
                to: "",
                value: 0,
                data: ""
            }
        }

        const inputBalance = await getTokenBalance(_chainId, address, inputToken);
        const outputBalance = await getTokenBalance(_chainId, address, outputToken);
        const newOutputAmount = (BigInt(inputBalance) * BigInt(outputBalance)) / (inputBalance - BigInt(inputAmount));

        return { outputAmount: newOutputAmount - outputBalance, to: "", value: 0, data: "", price: 0, gas: 0n }
    },
    getInputAmountQuote: async ({ inputToken, outputToken, outputAmount, chainId: _chainId }) => {
        if (tokenA != undefined && tokenB != undefined && (tokenA != inputToken && tokenB != outputToken) || (tokenB != inputToken && tokenA != outputToken) || (chainId != undefined && chainId != _chainId)) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: 0n,
                to: "",
                value: 0,
                data: ""
            }
        }

        const inputBalance = await getTokenBalance(_chainId, address, inputToken);
        const outputBalance = await getTokenBalance(_chainId, address, outputToken);

        const newInputAmount = (BigInt(inputBalance) * BigInt(outputBalance)) / (outputBalance - BigInt(outputAmount));

        return { outputAmount: newInputAmount - inputBalance, to: "", value: 0, data: "", price: 0, gas: 0n }
    }
});