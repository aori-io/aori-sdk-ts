import { AORI_HTTP_API, AoriEventData, AoriMethods, AoriOrder, createOrder, rawCall, SignedOrder, SubscriptionEvents, Wallet } from "../utils"

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
// TODO: deprecate
export async function receivePriceQuote(req: AoriPartialRequest, apiUrl: string = AORI_HTTP_API) {
    const { data } = await rawCall<AoriEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Rfq, [req]);
    return data;
}

// TODO: deprecate
export async function requestForQuote(wallet: Wallet, req: Omit<AoriPartialRequest, "address"> & { address?: string }, apiUrl: string = AORI_HTTP_API) {
    const offerer = req.address || wallet.address;
    const { order: { outputAmount} } = await receivePriceQuote({ ...req, address: offerer }, apiUrl);
    
    const { order, extraData, signature } = await createOrder({
        offerer,
        inputToken: req.inputToken,
        inputAmount: req.inputAmount,
        outputToken: req.outputToken,
        outputAmount: outputAmount,
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
        order
    };
}

// TODO: deprecate; move to using sendIntent
export async function sendRFQ(req: SignedOrder | { order: AoriOrder, signature: string }, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Rfq, [req]);
}

export async function sendIntent(req: SignedOrder, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, "aori_intent", [req]);
}