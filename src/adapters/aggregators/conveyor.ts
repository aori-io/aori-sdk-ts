import { InputAmountRequest, OutputAmountRequest, PriceRequest, Quoter } from "../Quoter";
import axios from "axios";

export const CONVEYOR_API_URL = "https://api.conveyor.finance";
export class ConveyorQuoter implements Quoter {
    url: string;

    constructor({ url }: { url: string }) {
        this.url = url;
    }

    static build({ url }: { url: string }) {
        return new ConveyorQuoter({ url });
    }

    name() {
        return "conveyor";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, chainId, fromAddress }: OutputAmountRequest) {
        const { data: { body } } = await axios.post(this.url, {
            tokenIn: inputToken,
            tokenOut: outputToken,
            amountIn: inputAmount,
            slippage: "50",
            chainId,
            recipient: fromAddress,
            partner: "Aori"
        });

        return {
            outputAmount: BigInt(body.info.amountOut),
            to: body.tx.to,
            value: body.tx.value,
            data: body.tx.data,
            price: 0,
            gas: BigInt(body.tx.gas)
        }
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, chainId, fromAddress }: InputAmountRequest) {
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