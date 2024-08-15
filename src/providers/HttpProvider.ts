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

export async function receivePriceQuote(req: AoriPartialRequest, apiUrl: string = AORI_HTTP_API): Promise<AoriPartialRequest & {
    inputAmount: string,
    topOutputAmount: string,
    zone: string,
    deadline: number
}> {
    const { data } = await axios.post(apiUrl, {
        id: 1,
        jsonrpc: "2.0",
        method: AoriMethods.Rfq,
        params: [req]
    });

    return data.result;
}

export async function requestForQuote(wallet: Wallet, req: Omit<AoriPartialRequest, "address"> & { address?: string }, apiUrl: string = AORI_HTTP_API) {
    const offerer = req.address || wallet.address;
    const { topOutputAmount } = await receivePriceQuote({ ...req, address: offerer }, apiUrl);
    
    const { order, orderHash, signature } = await createAndSignResponse(wallet, {
        offerer,
        inputToken: req.inputToken,
        inputAmount: BigInt(req.inputAmount),
        outputToken: req.outputToken,
        outputAmount: BigInt(topOutputAmount),
        chainId: req.chainId,
        zone: req.zone,
        toWithdraw: true
    });
    return {
        quote: {
            take: () => {
                return axios.post(apiUrl, {
                    id: 1,
                    jsonrpc: "2.0",
                    method: AoriMethods.Rfq,
                    params: [{
                        order,
                        signature
                    }]
                }); 
            },
            order
        },
        orderHash,
        signature,
        inputAmount: req.inputAmount,
        topOutputAmount,
        zone: req.zone,
        deadline: req.deadline,
    };
}