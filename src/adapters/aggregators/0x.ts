import { PriceRequest, Quoter } from "../Quoter";
import axios from "axios";

export const ZEROX_MAINNET_API_URL = "https://api.0x.org/swap/v1/quote";
export const ZEROX_SEPOLIA_API_URL = "https://sepolia.api.0x.org/swap/v1/quote";
export const ZEROX_POLYGON_API_URL = "https://polygon.api.0x.org/swap/v1/quote";
export const ZEROX_MUMBAI_API_URL = "https://mumbai.api.0x.org/swap/v1/quote";
export const ZEROX_BINANCE_API_URL = "https://bsc.api.0x.org/swap/v1/quote";
export const ZEROX_OPTIMISM_API_URL = "https://optimism.api.0x.org/swap/v1/quote";
export const ZEROX_FANTOM_API_URL = "https://fantom.api.0x.org/swap/v1/quote";
export const ZEROX_CELO_API_URL = "https://celo.api.0x.org/swap/v1/quote";
export const ZEROX_AVALANCHE_API_URL = "https://avalanche.api.0x.org/swap/v1/quote";
export const ZEROX_ARBITRUM_API_URL = "https://arbitrum.api.0x.org/swap/v1/quote";
export const ZEROX_BASE_API_URL = "https://api.0x.org/swap/v1/quote";

export class ZeroExQuoter implements Quoter {
    url: string;
    apiKey: string;

    constructor({
        url,
        apiKey
    }: {
        url: string;
        apiKey: string;
    }) {
        this.url = url;
        this.apiKey = apiKey;
    }

    static build({ url, apiKey }: { url: string; apiKey: string }) {
        return new ZeroExQuoter({ url, apiKey });
    }

    name() {
        return "0x";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount }: PriceRequest) {
        const { data } = await axios.get(this.url, {
            params: {
                sellToken: inputToken,
                sellAmount: inputAmount,
                buyToken: outputToken
            },
            headers: {
                '0x-api-key': this.apiKey
            },
        });

        return {
            outputAmount: BigInt(data.buyAmount),
            to: data.to,
            value: 0,
            data: data.data,
            price: parseFloat(data.price),
            gas: BigInt(data.gas)
        };
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount }: PriceRequest) {
        const { data } = await axios.get(this.url, {
            params: {
                sellToken: inputToken,
                buyAmount: outputAmount,
                buyToken: outputToken
            },
            headers: {
                '0x-api-key': this.apiKey
            },
        });

        return {
            outputAmount: BigInt(data.sellAmount),
            to: data.to,
            value: 0,
            data: data.data,
            price: parseFloat(data.price),
            gas: BigInt(data.gas)
        }
    }
}