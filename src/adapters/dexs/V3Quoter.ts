
import { staticCall } from "../../providers";
import { UniswapQuoterV2__factory } from "../../types/factories/adapters/UniswapQuoterV2__factory";
import { PriceRequest, Quoter } from "../Quoter";

export class V3Quoter implements Quoter {
    routerContractAddress: string;
    quoterContractAddress: string;

    name() {
        return "V3";
    }

    constructor({
        routerContractAddress,
        quoterContractAddress
    }: {
        routerContractAddress: string;
        quoterContractAddress: string;
    }) {
        this.quoterContractAddress = quoterContractAddress;
        this.routerContractAddress = routerContractAddress;
    }

    static build({
        routerContractAddress,
        quoterContractAddress
    }: {
        routerContractAddress: string;
        quoterContractAddress: string;
    }) {
        return new V3Quoter({
            routerContractAddress,
            quoterContractAddress
        });
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, chainId, fromAddress }: PriceRequest) {
        const output = await staticCall({
            to: this.quoterContractAddress,
            // @ts-ignore
            data: QuoterV2__factory.createInterface().encodeFunctionData("quoteExactInputSingle", [
                [
                    inputToken,
                    outputToken,
                    inputAmount,
                    3000,
                    0
                ]]),
            chainId
        });

        const [
            outputAmount,
            sqrtPriceLimitX96,
            _, // initializedTicksCrossed
            gasEstimate
        ] = UniswapQuoterV2__factory.createInterface().decodeFunctionResult("quoteExactInputSingle", output);

        return {
            to: this.routerContractAddress,
            value: 0,
            // @ts-ignore
            data: SwapRouter02__factory.createInterface().encodeFunctionData("exactInputSingle", [
                [
                    inputToken, //Take USDC
                    outputToken, //and buy WETH
                    3000, // fee
                    fromAddress, // recipient
                    inputAmount,
                    outputAmount,
                    String(0)
                ]
            ]),
            outputAmount,
            price: 0,
            gas: gasEstimate
        }
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, chainId, fromAddress }: PriceRequest) {
        const output = await staticCall({
            to: this.quoterContractAddress,
            // @ts-ignore
            data: QuoterV2__factory.createInterface().encodeFunctionData("quoteExactOutputSingle", [{
                tokenIn: String(inputToken),
                tokenOut: String(outputToken),
                amountOut: outputAmount,
                fee: 3000,
                sqrtPriceLimitX96: 0
            }]),
            chainId
        });

        const [
            inputAmount,
            sqrtPriceLimitX96,
            _, // initializedTicksCrossed
            gasEstimate // gasEstimate
        ] = UniswapQuoterV2__factory.createInterface().decodeFunctionResult("quoteExactOutputSingle", output);

        return {
            to: this.routerContractAddress,
            value: 0,
            // @ts-ignore
            data: SwapRouter02__factory.createInterface().encodeFunctionData("exactOutputSingle", [
                [
                    inputToken, //Take USDC
                    outputToken, //and buy WETH
                    3000,
                    fromAddress,
                    inputAmount,
                    0, // amountOutMinimum = 0, caution when using!
                    String(0)
                ]
            ]),
            outputAmount: inputAmount,
            price: 0,
            gas: gasEstimate,
        }
    }
}