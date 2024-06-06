import { PriceRequest, Quoter } from "../Quoter";
import axios from "axios";

export const OPENOCEAN_API_URL = "https://open-api.openocean.finance/v4";

// Token whitelist array
const tokenWhitelist = [
    "0x4300000000000000000000000000000000000004", 
    "0x4300000000000000000000000000000000000003", 
];

export class OpenOceanQuoter implements Quoter {
    url: string;
    chain: string;

    constructor({ url, chain }: { url: string; chain: string }) {
        this.url = url;
        this.chain = chain;
    }

    static build({ url, chain }: { url: string; chain: string }) {
        return new OpenOceanQuoter({ url, chain });
    }

    name() {
        return "openocean";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress }: PriceRequest) {
        const startTime = Date.now();
        if (!tokenWhitelist.includes(inputToken) || !tokenWhitelist.includes(outputToken)) {
            throw new Error("Input or output token is not on the whitelist");
        }
        const inputAmountInEther = Number(inputAmount) / 1e18;

        const { data } = await axios.get(`${this.url}/${this.chain}/swap`, {
            params: {
                inTokenAddress: inputToken,
                outTokenAddress: outputToken,
                amount: inputAmountInEther,
                gasPrice: 10,
                slippage: 1,
                account: fromAddress,                
            }
        });

        const outputAmount = BigInt(data.data.outAmount);
        const gasEstimate = 0n;

        const endTime = Date.now();

        console.log(`OpenOcean OutputAmount: ${outputAmount} Time: ${endTime - startTime}ms`);
        return {
            outputAmount: BigInt(data.data.outAmount),
            to: data.data.to,
            value: data.data.value,
            data: data.data.data,
            price: parseFloat(data.data.price),
            gas: BigInt(data.data.estimatedGas)
        };
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, chainId, fromAddress }: PriceRequest) {
        throw new Error("Not implemented");

        return {
            outputAmount: BigInt(0),
            to: "",
            value: 0,
            data: "",
            price: 0,
            gas: BigInt(0)
        }
    }
}