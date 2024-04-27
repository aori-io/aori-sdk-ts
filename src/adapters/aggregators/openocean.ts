import { PriceRequest, Quoter } from "../Quoter";
import axios from "axios";

export const OPENOCEAN_API_URL = "https://open-api.openocean.finance/v4";

export class OpenOceanQuoter implements Quoter {
    url: string;

    constructor({ url }: { url: string }) {
        this.url = url;
    }

    static build({ url }: { url: string; }) {
        return new OpenOceanQuoter({ url });
    }

    name() {
        return "openocean";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress, chainId }: PriceRequest) {

        const { data } = await axios.get(`${this.url}/${chainId}/swap`, {
            params: {
                inTokenAddress: inputToken,
                outTokenAddress: outputToken,
                amount: inputAmount,
                account: fromAddress,
                slippage: 2,
                allowPartialFill: false,
                gasPrice: 1
            }
        });

        return {
            outputAmount: BigInt(data.data.outAmount),
            to: data.data.to,
            value: data.data.value,
            data: data.data.data,
            price: parseFloat(data.data.price),
            gas: BigInt(1000000000n)
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