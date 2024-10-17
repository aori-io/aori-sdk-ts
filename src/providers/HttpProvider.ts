import axios from "axios"
import { AORI_HTTP_API, AoriEventData, AoriMethods, AoriOrder, createAndSignResponse, createLimitOrder, QuoteRequestedDetails, rawCall, SubscriptionEvents, Wallet } from "../utils"

interface AoriFullRequest {
    order: AoriOrder,
    signature: string,
    isPrivate?: boolean
}

interface AoriPartialRequest {
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    zone?: string,
    chainId: number,
    deadline?: number,
}

export async function receivePriceQuote(req: AoriPartialRequest, apiUrl: string = AORI_HTTP_API) {
    const { data } = await rawCall<AoriEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Rfq, [req]);
    if (data.orderType !== "rfq") throw new Error("Order type is not rfq");
    return data;
}

export async function requestForQuote(wallet: Wallet, req: Omit<AoriPartialRequest, "address"> & { address?: string }, apiUrl: string = AORI_HTTP_API) {
    const offerer = req.address || wallet.address;
    const { takerOrder } = await receivePriceQuote({ ...req, address: offerer }, apiUrl);
    if (!takerOrder.outputAmount) throw new Error("No output amount received");
    
    const { order, signature } = await createAndSignResponse(wallet, {
        offerer,
        inputToken: req.inputToken,
        inputAmount: BigInt(req.inputAmount),
        outputToken: req.outputToken,
        outputAmount: BigInt(takerOrder.outputAmount),
        chainId: req.chainId,
        zone: req.zone,
        toWithdraw: true
    });
    return {
        quote: {
            take: async () => {
                return await sendIntent({
                    order,
                    signature
                }, apiUrl);
            },
            order
        },
        takerOrder
    };
}

export async function sendIntent(req: AoriFullRequest, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.QuoteReceived>>(apiUrl, AoriMethods.Rfq, [req]);
}

export async function sendLimitOrder(req: AoriFullRequest, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.QuoteReceived>>(apiUrl, AoriMethods.Make, [req]);
}