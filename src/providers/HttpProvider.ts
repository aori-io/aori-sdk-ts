import { AORI_HTTP_API, AoriEventData, AoriMethods, createOrder, rawCall, SignedOrder, SubscriptionEvents, Wallet } from "../utils"

interface AoriPartialRequest {
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    zone?: string,
    chainId: number,
    deadline?: number,
}

// TODO: move to aori_priceQuote
export async function receivePriceQuote(req: AoriPartialRequest, apiUrl: string = AORI_HTTP_API) {
    const { data } = await rawCall<AoriEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Rfq, [req]);
    if (data.orderType !== "rfq") throw new Error("Order type is not rfq");
    return data;
}

export async function requestForQuote(wallet: Wallet, req: Omit<AoriPartialRequest, "address"> & { address?: string }, apiUrl: string = AORI_HTTP_API) {
    const offerer = req.address || wallet.address;
    const { takerOrder } = await receivePriceQuote({ ...req, address: offerer }, apiUrl);
    if (!takerOrder.outputAmount) throw new Error("No output amount received");
    
    const { order, extraData, signature } = await createOrder({
        offerer,
        inputToken: req.inputToken,
        inputAmount: req.inputAmount,
        outputToken: req.outputToken,
        outputAmount: takerOrder.outputAmount,
        chainId: req.chainId,
        zone: req.zone,
        toWithdraw: true
    }, wallet);
    return {
        quote: {
            take: async () => {
                return await sendIntent({
                    order,
                    extraData,
                    signature
                }, apiUrl);
            },
            order
        },
        takerOrder
    };
}

export async function sendIntent(req: SignedOrder, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.QuoteReceived>>(apiUrl, "aori_intent", [req]);
}