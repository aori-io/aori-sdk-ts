import { AORI_HTTP_API, AoriEventData, AoriMethods, AoriOrder, AoriWebsocketEventData, CreateLimitOrderParams, rawCall, SubscriptionEvents, Wallet } from "../utils"
import { getDefaultZone } from "../utils/validation";
import { getBytes, solidityPackedKeccak256 } from "ethers";

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

export async function respondToOrder(req: { tradeId: string } & AoriFullRequest, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<AoriEventData<SubscriptionEvents.TradeMatched | SubscriptionEvents.QuoteReceived>>(apiUrl, AoriMethods.Respond, [req]);
}

/*//////////////////////////////////////////////////////////////
                    ORDER HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function formatIntoLimitOrder({
    offerer,
    startTime = Math.floor((Date.now() - 10 * 60 * 1000) / 1000), // Start 10 minutes in the past
    endTime = Math.floor((Date.now() + 10 * 60 * 1000) / 1000), // End 10 minutes in the future 
    inputToken,
    inputAmount,
    chainId = 1,
    zone = getDefaultZone(chainId),
    outputToken,
    outputAmount,
    toWithdraw = true
}: CreateLimitOrderParams): Promise<AoriOrder> {

    return {
        offerer,
        inputToken,
        inputAmount: inputAmount.toString(),
        outputToken,
        outputAmount: outputAmount.toString(),
        recipient: offerer,
        zone,
        chainId,
        startTime: `${startTime}`,
        endTime: `${endTime}`,
        toWithdraw
    }
}

export const createLimitOrder = formatIntoLimitOrder;
export const newLimitOrder = formatIntoLimitOrder;

/*//////////////////////////////////////////////////////////////
                        ORDER SIGNATURE
//////////////////////////////////////////////////////////////*/

export function getOrderHash({
    offerer,
    inputToken,
    inputAmount,
    outputToken,
    outputAmount,
    recipient,
    zone,
    chainId,
    startTime,
    endTime,
    toWithdraw
}: AoriOrder): string {
    return solidityPackedKeccak256([
        "address", // offerer
        "address", // inputToken
        "uint256", // inputAmount
        "address", // outputToken
        "uint256", // outputAmount
        "address", // recipient
        // =====
        "address", // zone
        "uint160", // chainId
        // =====
        "uint32", // startTime
        "uint32", // endTime
        "bool" // toWithdraw
    ], [
        offerer, inputToken, inputAmount, outputToken, outputAmount, recipient, zone, chainId,
        startTime, endTime, toWithdraw
    ]);
}

export function signOrderSync(wallet: Wallet, order: AoriOrder) {
    const orderHash = getOrderHash(order);
    return signOrderHashSync(wallet, orderHash);
}
export const signOrder = signOrderSync;

export function signOrderHashSync(wallet: Wallet, orderHash: string) {
    return wallet.signMessageSync(getBytes(orderHash));
}

export async function createAndSignResponse(wallet: Wallet, orderParams: Parameters<typeof createLimitOrder>[0]): Promise<{ order: AoriOrder, orderHash: string, signature: string }> {
    const order = await createLimitOrder(orderParams);
    const orderHash = getOrderHash(order);
    const signature = signOrderSync(wallet, order);
    return { order, orderHash, signature };
}