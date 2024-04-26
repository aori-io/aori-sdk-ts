import { Quoter } from "../Quoter";

export const oneForOneQuoterFactory: ((tokenA: string, tokenB: string) => Quoter) = (tokenA, tokenB) => ({
    name: () => "name",
    getInputAmountQuote: async ({ inputToken, outputToken, outputAmount, chainId }) => {
        if (tokenA == inputToken && tokenB == outputToken) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: BigInt(outputAmount),
                to: "",
                value: 0,
                data: ""
            }
        } else if (tokenB == inputToken && tokenA == outputToken) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: BigInt(outputAmount),
                to: "",
                value: 0,
                data: ""
            }
        } else {
            return {
                price: 0,
                gas: 0n,
                outputAmount: 0n,
                to: "",
                value: 0,
                data: ""
            }
        }
    },
    getOutputAmountQuote: async ({ inputToken, outputToken, inputAmount, chainId }) => {
        if (tokenA == inputToken && tokenB == outputToken) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: BigInt(inputAmount),
                to: "",
                value: 0,
                data: ""
            }
        } else if (tokenB == inputToken && tokenA == outputToken) {
            return {
                price: 0,
                gas: 0n,
                outputAmount: BigInt(inputAmount),
                to: "",
                value: 0,
                data: ""
            }
        } else {
            return {
                price: 0,
                gas: 0n,
                outputAmount: 0n,
                to: "",
                value: 0,
                data: ""
            }
        }
    }
});