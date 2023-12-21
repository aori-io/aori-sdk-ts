import axios from "axios"
import { JsonRpcError, JsonRpcResult } from "ethers"
import { AORI_SOLUTION_STORE_API } from "../utils"
import { AoriSolutionStoreMethods } from "./utils"

export class AoriSolutionStore {
    async saveSolution({
        orderHash,
        chainId,
        to,
        value,
        data,
        from
    }: {
        orderHash: string
        chainId: number
        to: string
        value: number
        data: string
        from: string
    }) {
        const response = await this.rawCall({
            method: AoriSolutionStoreMethods.SaveSolution,
            params: [{ orderHash, chainId, to, value, data, from }]
        });
        return response;
    }

    async getSolution({
        orderHash,
        chainId
    }: {
        orderHash: string
        chainId: number
    }): Promise<{
        orderHash: string;
        chainId: number;
        to: string;
        value: number;
        data: string;
        from: string
    }> {
        const response = await this.rawCall({
            method: AoriSolutionStoreMethods.GetSolution,
            params: [{ orderHash, chainId }]
        });
        return response;
    }

    async rawCall<T>({
        method,
        params
    }: {
        method: AoriSolutionStoreMethods | string,
        params: [T] | []
    }) {
        const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(AORI_SOLUTION_STORE_API, {
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