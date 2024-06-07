import axios from "axios";
import { PriceRequest, Quoter, Quote } from "../Quoter";

export const OOGABOOGA_SWAP_API_URL = "https://testnet.api.oogabooga.io/v1/swap/";

export class OogaBoogaQuoter implements Quoter {
    url: string;
    apiKey: string;

    constructor({ url, apiKey }: { url: string, apiKey: string }) {
        this.apiKey = apiKey;
        this.url = url;
    }

    static build({ url, apiKey }: { url:string, apiKey: string }) {
        return new OogaBoogaQuoter({ url, apiKey });
    }

    name() {
        return "oogabooga";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress, chainId }: PriceRequest): Promise<Quote> {
        if (!inputAmount) {
            throw new Error("inputAmount is required");
        }

        const headers = {
            Authorization: `Bearer ${this.apiKey}`,
        };

        const params = {
            tokenIn: inputToken,
            from: fromAddress,
            amount: inputAmount.toString(),
            tokenOut: outputToken,
            to: fromAddress,
            slippage: 0.01.toString(),
        };

        const res = await axios.get(this.url, { headers, params });
        const { tx, assumedAmountOut, price } = res.data;

        return {
            outputAmount: BigInt(assumedAmountOut),
            to: tx.to,
            value: Number(tx.value),
            data: tx.data as `0x${string}`,
            price: parseFloat(price),
            gas: BigInt(0),
        };
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, fromAddress, chainId }: PriceRequest): Promise<Quote> {
        // Implementation of getInputAmountQuote can be added here
        throw new Error("Not implemented");

        return {
            outputAmount: BigInt(0),
            to: "",
            value: 0,
            data: "",
            price: 0,
            gas: BigInt(0),
        };
    }
}