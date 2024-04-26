
import axios from "axios";
import { PriceRequest, Quoter } from "../Quoter";

export const ODOS_API_URL = "https://api.odos.xyz";

export class OdosQuoter implements Quoter {

    url: string;

    constructor({ url }: { url: string }) {
        this.url = url;
    }
    static build({ url }: { url: string }) {
        return new OdosQuoter({ url });
    }

    name() {
        return "odos";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, chainId, fromAddress }: PriceRequest) {
        const { data } = await axios.post(`${this.url}/sor/quote/v2`, {
            chainId,
            inputTokens: [
                {
                    tokenAddress: inputToken,
                    amount: inputAmount,
                }
            ],
            outputTokens: [
                {
                    tokenAddress: outputToken,
                    proportion: 1
                }
            ],
            userAddr: fromAddress,
            slippageLimitPercent: 0.3,
            referralCode: 0,
            compact: true,
        });

        const { data: _data } = await axios.post(`${this.url}/sor/assemble`, {
            userAddr: fromAddress,
            pathId: data.pathId,
        });

        return {
            outputAmount: BigInt(_data.outputTokens[0].amount),
            to: _data.transaction.to,
            value: _data.transaction.value,
            data: _data.transaction.data,
            price: parseFloat("0"),
            gas: BigInt(_data.transaction.gas)
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