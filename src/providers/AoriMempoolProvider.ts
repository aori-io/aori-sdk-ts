import axios from "axios";
import { JsonRpcError, JsonRpcResult } from "ethers";
import { AORI_MEMPOOL_PROVIDER_API } from "../utils";
import { AoriMempoolProviderMethods, DetailsToExecute } from "../utils/interfaces";

export class AoriMempoolProvider {

    async getMatchDetails({
        matchingHash
    }: { matchingHash: string }): Promise<DetailsToExecute> {

        const data = await this.rawCall({
            method: AoriMempoolProviderMethods.AoriGetMatchDetails,
            params: [{ matchingHash }]
        });
        return data;
    }

    async matchHistory(): Promise<DetailsToExecute[]> {
        const data = await this.rawCall({
            method: AoriMempoolProviderMethods.AoriMatchHistory,
            params: []
        });
        return data;
    }

    async outstandingMatches(maker: string): Promise<DetailsToExecute[]> {
        const data = await this.rawCall({
            method: AoriMempoolProviderMethods.AoriOutstandingMatches,
            params: [{
                maker
            }]
        });
        return data;
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