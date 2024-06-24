import axios from "axios";
import { JsonRpcError, JsonRpcResult } from "ethers";
import { AORI_PRICING_PROVIDER_API } from "../utils";
import { AoriPricingMethods } from "../utils/interfaces";

export class AoriPricingProvider {

    async getTokenPrice({
        chainId,
        token,
        amount
    }: {
        chainId: number,
        token: string,
        amount: string
    }) {

        const data = await this.rawCall({
            method: AoriPricingMethods.GetToken,
            params: [{ chainId, token, amount }]
        });
        return data.price.price;
    }

    async calculateGasInToken({
        chainId,
        gas,
        token
    }: {
        chainId: number,
        gas: number,
        token: string
    }): Promise<bigint> {
        const data = await this.rawCall({
            method: AoriPricingMethods.CalculateGasInToken,
            params: [{ chainId, gas, token }]
        });
        return BigInt(data.gasInToken);
    }

    async currentGasInToken({
        chainId,
        gasLimit,
        token
    }: {
        chainId: number,
        gasLimit: number,
        token: string
    }): Promise<{ chainId: number, gasLimit: number, gasPrice: number, token: string, gasInToken: string, gasInUSD: number }> {
        const data = await this.rawCall({
            method: AoriPricingMethods.CurrentGasInToken,
            params: [{ chainId, gasLimit, token }]
        });

        return data;
    }

    async rawCall<T>({
        method,
        params
    }: {
        method: AoriPricingMethods | string,
        params: [T] | []
    }) {
        const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(AORI_PRICING_PROVIDER_API, {
            id: 1,
            jsonrpc: "2.0",
            method,
            params
        });

        if ("error" in axiosResponseData) {
            throw new Error(axiosResponseData.error.message);
        }

        const { result: data } = axiosResponseData;
        return data;
    }
}

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

const pricingProvider = new AoriPricingProvider();

export function getTokenPrice(chainId: number, token: string, amount: string): Promise<number> {
    return pricingProvider.getTokenPrice({ chainId, token, amount });
}

export function calculateGasInToken(chainId: number, gas: number, token: string): Promise<bigint> {
    return pricingProvider.calculateGasInToken({ chainId, gas, token });
}

export function getCurrentGasInToken(chainId: number, gasLimit: number, token: string) {
    return pricingProvider.currentGasInToken({ chainId, gasLimit, token });
}