import axios from "axios"
import { AORI_HTTP_API, AoriMethods } from "../utils"

interface AoriPartialRequest {
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount?: string,
    outputAmount?: string,
    zone?: string,
    chainId: number,
    deadline?: number
}

export async function requestPriceQuote(req: AoriPartialRequest) {
    const { data } = await axios.post(AORI_HTTP_API, {
        id: 1,
        method: AoriMethods.Rfq,
        params: req
    });

    // 
}

export async function requestForQuote(req: AoriPartialRequest) {
    // TODO: 
}