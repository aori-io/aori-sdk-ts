import axios from "axios";
import { JsonRpcError, JsonRpcResult } from "ethers";
import { AORI_MEMPOOL_PROVIDER_API } from "../utils";
import { AoriMempoolProviderMethods, DetailsToExecute } from "../utils/interfaces";

export type AoriMempoolMatch = DetailsToExecute & {
    outstanding: boolean,
    submittedAt: number,
    settledAt?: number,
};

export class AoriMempoolProvider {

    async submitMatch({
        matching,
        secret
    }: {
        matching: DetailsToExecute,
        secret: string
    }) {

        const data = await this.rawCall({
            method: AoriMempoolProviderMethods.AoriSubmitMatch,
            params: [{
                matching,
                secret
            }]
        });
        return data;
    }

    async viewMatches({
        matchingHash,
        maker,
        outstanding
    }: {
        matchingHash?: string,
        maker?: string,
        outstanding?: boolean
    }): Promise<AoriMempoolMatch[]> {

        const matches = await this.rawCall({
            method: AoriMempoolProviderMethods.AoriViewMatches,
            params: [{
                matchingHash,
                maker,
                outstanding
            }]
        });
        return matches;
    }

    async rawCall<T>({
        method,
        params
    }: {
        method: AoriMempoolProviderMethods | string,
        params: [T] | []
    }) {
        const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(AORI_MEMPOOL_PROVIDER_API, {
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