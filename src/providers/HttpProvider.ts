import axios from "axios"
import { AORI_HTTP_API, AoriMethods, createAndSignResponse, createLimitOrder, Wallet } from "../utils"

interface AoriPartialRequest {
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    zone?: string,
    chainId: number,
    deadline?: number
}

export async function requestPriceQuote(req: AoriPartialRequest): Promise<AoriPartialRequest & {
    inputAmount: string,
    outputAmount: string,
    zone: string,
    deadline: number
}> {
    const { data } = await axios.post(AORI_HTTP_API, {
        id: 1,
        method: AoriMethods.Rfq,
        params: req
    });

    return data;
}

export async function requestForQuote(wallet: Wallet, req: AoriPartialRequest) {
    const { outputAmount } = await requestPriceQuote(req);
    
    const { order, orderHash, signature } = await createAndSignResponse(wallet, {
        offerer: wallet.address,
        inputToken: req.inputToken,
        inputAmount: BigInt(req.inputAmount),
        outputToken: req.outputToken,
        outputAmount: BigInt(outputAmount),
        chainId: req.chainId,
        zone: req.zone,
        toWithdraw: true
    });
    return { order: { sendIntentToRfq: () => {
        return axios.post(AORI_HTTP_API, {
            id: 1,
            method: AoriMethods.Rfq,
            params: {
                order,
                signature
            }
        }); 
    }, details: order }, orderHash, signature };
}