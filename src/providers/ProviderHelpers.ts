import { BigNumberish, JsonRpcError, JsonRpcResult, Wallet, ZeroAddress } from "ethers";
import { AORI_HTTP_API, AORI_ORDERBOOK_API, AORI_TAKER_API, AoriMatchingDetails, AoriMethods, AoriMethodsEvents, AoriOrder, createLimitOrder, createMatchingOrder, DetailsToExecute, getOrderHash, OrderView, signOrderHashSync, signOrderSync, ViewOrderbookQuery } from "../utils";
import axios from "axios";

/*//////////////////////////////////////////////////////////////
                        STANDALONE FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function rawCall<T>({
    method,
    params
}: {
    method: AoriMethods | string,
    params: [T] | []
}, apiUrl: string = AORI_HTTP_API) {
    const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(apiUrl, {
        id: 1,
        jsonrpc: "2.0",
        method,
        params
    });
    if ("error" in axiosResponseData) {
        throw axiosResponseData.error.message;
    }

    const { result: data } = axiosResponseData;
    return data;
}

export async function ping(apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.Ping][0]> {
    return await rawCall({
        method: AoriMethods.Ping,
        params: []
    }, apiUrl);
}

export async function accountDetails(apiKey: string, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.AccountDetails][0]> {
    return await rawCall({
        method: AoriMethods.AccountDetails,
        params: [{
            apiKey
        }]
    }, apiUrl)
}

export async function makeOrder({
    order,
    signature,
    isPrivate = false,
    apiKey
}: {
    order: AoriOrder,
    signature: string,
    isPrivate?: boolean,
    apiKey?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]> {
    return await rawCall({
        method: AoriMethods.MakeOrder,
        params: [{
            order,
            signature,
            signer: ZeroAddress,
            isPublic: !isPrivate,
            apiKey,
        }]
    }, apiUrl);
}

export async function takeOrder({
    orderHash,
    order,
    signature,
    seatId = 0,
    apiKey,
    showExecutionDetails = true
}: {
    orderHash: string,
    order: AoriOrder,
    signature: string,
    seatId?: number,
    apiKey?: string,
    showExecutionDetails?: boolean
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.TakeOrder][0]> {
    return await rawCall({
        method: AoriMethods.TakeOrder,
        params: [{
            order,
            signature,
            orderHash,
            seatId,
            apiKey,
            showExecutionDetails
        }]
    }, apiUrl);
}

export async function marketOrder({
    order,
    signature,
    seatId = 0
}: {
    order: AoriOrder,
    signature: string,
    seatId?: number
}, takerUrl: string = AORI_TAKER_API) {
    return await rawCall({
        method: "aori_takeOrder",
        params: [{
            order,
            signature,
            seatId
        }]
    }, takerUrl);
}

export async function cancelOrder(
    params: {
        orderHash: string,
        siweMessage?: string,
        siweNonce?: string,
        signature: string,
    } | {
        orderHash: string,
        apiKey: string,
    },
    apiUrl: string = AORI_HTTP_API
): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {

    return await rawCall({
        method: AoriMethods.CancelOrder,
        params: [params]
    }, apiUrl);
}

export async function cancelAllOrders(params: {
    apiKey: string
    tag?: string,
} | {
    siweMessage?: string,
    siweNonce?: string,
    signature: string,
    tag?: string,
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]> {
    return await rawCall({
        method: AoriMethods.CancelAllOrders,
        params: [params]
    }, apiUrl);
}

export async function failOrder({
    matching,
    matchingSignature,
    makerMatchingSignature,
}: {
    matching: AoriMatchingDetails,
    matchingSignature: string,
    makerMatchingSignature?: string,
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.FailOrder]> {
    return await rawCall({
        method: AoriMethods.FailOrder,
        params: [{
            matching,
            matchingSignature,
            makerMatchingSignature,
        }]
    }, apiUrl);
}

export async function viewOrderbook(query?: ViewOrderbookQuery, apiUrl: string = AORI_ORDERBOOK_API): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
    const { orders } = await rawCall({
        method: AoriMethods.ViewOrderbook,
        params: query != undefined ? [query] : []
    }, apiUrl);
    return orders;
}

export async function requestQuote({
    inputToken,
    inputAmount,
    outputToken,
    chainId,
    apiKey
}: {
    inputToken: string,
    inputAmount: BigNumberish,
    outputToken: string,
    chainId: number,
    apiKey?: string
}, apiUrl: string = AORI_TAKER_API): Promise<void> {
    return await rawCall({
        method: AoriMethods.RequestQuote,
        params: [{
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey
        }]
    }, apiUrl);
}

export async function requestSwap({
    order,
    signature,
    apiKey
}: {
    order: AoriOrder,
    signature: string,
    apiKey?: string
}, apiUrl: string = AORI_TAKER_API): Promise<void> {
    return await rawCall({
        method: AoriMethods.RequestSwap,
        params: [{
            order,
            signature,
            apiKey
        }]
    }, apiUrl);
}

export async function quote({
    inputToken,
    inputAmount,
    outputToken,
    chainId,
    apiKey,
    delay
}: {
    inputToken: string,
    inputAmount: BigNumberish,
    outputToken: string,
    chainId: number,
    apiKey?: string,
    delay?: number
}, apiUrl: string = AORI_TAKER_API): Promise<AoriMethodsEvents[AoriMethods.Quote][0]> {
    const { orders } = await rawCall({
        method: AoriMethods.Quote,
        params: [{
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey,
            delay
        }]
    }, apiUrl);

    return orders;
};

export async function receivePriceQuote({
    wallet,
    inputToken,
    inputAmount,
    outputToken,
    chainId,
    apiKey,
    delay
}: {
    wallet : Wallet,
    inputToken: string,
    inputAmount: BigNumberish,
    outputToken: string,
    chainId: number,
    apiKey?: string,
    delay?: number
}, takerApiUrl: string = AORI_TAKER_API): Promise<{ outputAmount: string, orders: OrderView[], topOrder: { details: OrderView, take: () => Promise<void> } }> {

    const orders = await quote({
        inputToken,
        inputAmount,
        outputToken,
        chainId,
        apiKey,
        delay
    }, takerApiUrl);

    if (orders.length == 0) throw new Error("No orders found");

    return {
        outputAmount: orders[0].inputAmount,
        orders,
        topOrder: {
            details: orders[0],
            take: () => matchAndMarketOrder(wallet, orders[0].order, takerApiUrl)
        }
    }
}

/*//////////////////////////////////////////////////////////////
                        COMBINED FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function createAndMakeOrder(makerWallet: Wallet, orderParams: Parameters<typeof createLimitOrder>[0], apiUrl: string = AORI_HTTP_API, apiKey?: string) {
    const limitOrder = await createLimitOrder(orderParams);
    
    const order = await makeOrder({
        order: limitOrder,
        signature: await signOrderSync(makerWallet, limitOrder),
        apiKey
    }, apiUrl);

    return {
        orderHash: order.orderHash,
        order: {
            details: order,
            cancel: () => cancelOrder({
                orderHash: order.orderHash,
                signature: signOrderHashSync(makerWallet, order.orderHash)
            }, apiUrl)
        }
    }
}

export async function matchAndTakeOrder(takerWallet: Wallet, makerOrder: AoriOrder, apiUrl: string = AORI_HTTP_API) {
    const takerOrder = await createMatchingOrder(makerOrder, { offerer: takerWallet.address || "" });
    return await takeOrder({
        orderHash: getOrderHash(makerOrder),
        order: takerOrder,
        signature: signOrderSync(takerWallet, takerOrder)
    }, apiUrl);
}

export async function matchAndMarketOrder(takerWallet: Wallet, makerOrder: AoriOrder, takerApiUrl: string = AORI_TAKER_API) {
    const takerOrder = await createMatchingOrder(makerOrder, { offerer: takerWallet.address || "" });
    return await marketOrder({
        order: takerOrder,
        signature: signOrderSync(takerWallet, takerOrder)
    }, takerApiUrl);
}

export async function quoteAndTakeOrder(takerWallet: Wallet, quoteParams: Parameters<typeof quote>[0], apiUrl: string = AORI_HTTP_API, takerApiUrl: string = AORI_TAKER_API): Promise<DetailsToExecute | string | undefined> {
    const quoteOrders = await quote(quoteParams, takerApiUrl);
    while (quoteOrders.length != 0) {
        const orderView = quoteOrders.shift();
        if (orderView == undefined) {
            return undefined;
        }

        return await matchAndTakeOrder(takerWallet, orderView.order, apiUrl)
    }
}

export async function quoteAndRetryTakeOrder(takerWallet: Wallet, quoteParams: Parameters<typeof quote>[0], deadlineInMs: number = 15000, apiUrl: string = AORI_HTTP_API, takerApiUrl: string = AORI_TAKER_API): Promise<DetailsToExecute | string | undefined> {
    const deadline = new Date().getTime() + deadlineInMs;
    while (new Date().getTime() < deadline) {
        const quoteOrders = await quote(quoteParams, takerApiUrl);

        const orderView = quoteOrders.shift();
        if (orderView == undefined) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            continue;
        }

        return await matchAndTakeOrder(takerWallet, orderView.order, apiUrl)
    }
}
