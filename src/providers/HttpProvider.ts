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

export async function receivePriceQuote(req: AoriPartialRequest): Promise<AoriPartialRequest & {
    inputAmount: string,
    topOutputAmount: string,
    zone: string,
    deadline: number
}> {
    const { data } = await axios.post(AORI_HTTP_API, {
        id: 1,
        jsonrpc: "2.0",
        method: AoriMethods.Rfq,
        params: [req]
    });

    return data.result;
}

export async function requestForQuote(wallet: Wallet, req: AoriPartialRequest) {
    const { topOutputAmount } = await receivePriceQuote(req);
    
    const { order, orderHash, signature } = await createAndSignResponse(wallet, {
        offerer: wallet.address,
        inputToken: req.inputToken,
        inputAmount: BigInt(req.inputAmount),
        outputToken: req.outputToken,
        outputAmount: BigInt(topOutputAmount),
        chainId: req.chainId,
        zone: req.zone,
        toWithdraw: true
    });
    return { order: { sendIntentToRfq: () => {
        return axios.post(AORI_HTTP_API, {
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Rfq,
            params: [{
                order,
                signature
            }]
        }); 
    }, details: order }, orderHash, signature };
}