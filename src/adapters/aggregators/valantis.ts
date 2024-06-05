import axios from "axios";
import { PriceRequest, Quoter } from "../Quoter";

export const VALANTIS_HOT_API_URL = "https://hot.valantis.xyz/solver/order";

async function fetchAmountOut(tokenInAddress: string, tokenOutAddress: string, amountIn: bigint): Promise<bigint> {
    try {
        const responseIn = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenInAddress}&vs_currencies=usd`);
        const responseOut = await axios.get(`https://api.coingecko.com/api/v3/simple/token_price/ethereum?contract_addresses=${tokenOutAddress}&vs_currencies=usd`);

        const priceInUSD = responseIn.data[tokenInAddress.toLowerCase()].usd;
        const priceOutUSD = responseOut.data[tokenOutAddress.toLowerCase()].usd;

        if (priceInUSD === undefined || priceOutUSD === undefined) {
            throw new Error('Price data is not available for one of the tokens');
        }

        // Ensuring consistent precision with 12 decimal places
        const scaleFactor = BigInt(10 ** 12);

        const priceInScaled = BigInt(Math.round(priceInUSD * 10 ** 6));
        const priceOutScaled = BigInt(Math.round(priceOutUSD * 10 ** 6));

        // Calculating output amount
        const amountOut = (priceInScaled * amountIn) / priceOutScaled;

        // Adjusting for scale factor
        return amountOut / scaleFactor;
    } catch (error) {
        console.error('Error fetching amount out:', error);
        throw error;
    }
}

export class ValantisQuoter implements Quoter {
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

    static build({ url, apiKey }: { url: string, apiKey: string }) {
        return new ValantisQuoter({ url, apiKey });
    }

    name() {
        return "valantis";
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress, chainId }: PriceRequest) {
        if (!inputAmount) {
            throw new Error("inputAmount is required");
        }

        const AMOUNT_OUT = await fetchAmountOut(inputToken, outputToken, BigInt(inputAmount));

        const requestBody = {
            authorized_recipient: fromAddress,
            authorized_sender: fromAddress,
            chain_id: chainId,
            expected_gas_price: '0',
            expected_gas_units: '0',
            quote_expiry: Math.ceil(Date.now() / 1000) + 120,
            request_expiry: Math.ceil(Date.now() / 1000) + 30,
            token_in: inputToken,
            token_out: outputToken,
            volume_token_in: inputAmount,
            volume_token_out_min: (AMOUNT_OUT - BigInt(2000)).toString(),
        };

        const { data } = await axios.post(this.url, requestBody, {
            headers: {
                "X-API-Key": `${this.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });


        return {
            outputAmount: (AMOUNT_OUT - BigInt(2000)),
            to: data.pool_address,
            value: 0,
            data: data.signed_payload,
            price: parseFloat("0"),
            gas: BigInt(0)
        };
    
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, fromAddress, chainId }: PriceRequest) {
        if (!outputAmount) {
            throw new Error("outputAmount is required");
        }

        const amountOutBigInt = BigInt(outputAmount);
        const amountIn = await fetchAmountOut(outputToken, inputToken, amountOutBigInt);

        const requestBody = {
            authorized_recipient: fromAddress,
            authorized_sender: fromAddress,
            chain_id: chainId,
            request_expiry: Math.ceil(Date.now() / 1000) + 30,
            quote_expiry: Math.ceil(Date.now() / 1000) + 120,
            token_in: inputToken,
            token_out: outputToken,
            volume_token_in: amountIn.toString(),
            volume_token_out_min: outputAmount
        };

        const { data } = await axios.post(this.url, requestBody, {
            headers: {
                "X-API-Key": `${this.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });

        return {
            outputAmount: amountIn,
            to: data.pool_address,
            value: 0,
            data: data.signed_payload,
            price: parseFloat("0"),
            gas: BigInt(0)
        };
    }
}
