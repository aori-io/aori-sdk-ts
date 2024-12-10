import { EventEmitter } from "events";

/*//////////////////////////////////////////////////////////////
                         NATIVE TYPES
//////////////////////////////////////////////////////////////*/

export interface AoriOrder {
    offerer: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
    recipient: string;
    // ===== 
    zone: string;
    chainId: number;
    startTime: string;
    endTime: string;
    // =====
    toWithdraw: boolean;
}

export interface SignedOrder {
    order: AoriOrder;
    extraData: string;
    signature: string;
}

export interface AoriMatchingDetails {
    tradeId: string;

    makerSignature: string;
    takerSignature: string;

    feeTag: string;
    feeRecipient: string;
}

/*//////////////////////////////////////////////////////////////
                            ENUMS
//////////////////////////////////////////////////////////////*/

export enum AoriMethods {
    Ping = "aori_ping",
    Version = "aori_version",
    SupportedChains = "aori_supportedChains",
    Rfq = "aori_rfq",
    Respond = "aori_respond",
    Subscribe = "aori_subscribe",
    // =====
    Make = "aori_make",
    Take = "aori_take",
    Cancel = "aori_cancel",
    Fail = "aori_fail",
    // =====
    Intent = "aori_intent",
    Sequence = "aori_sequence"
}

export enum AoriDataProviderMethods {
    SendTransaction = "aori_sendTransaction",
    SimulateTransaction = "aori_simulateTransaction",
}

export enum AoriDataServerMethods {
    ViewTrades = "aori_viewTrades"
}

export enum AoriPricingMethods {
    CurrentGasInToken = "aori_currentGasInToken",
    GetToken = "aori_getToken",
    CalculateGasInToken = "aori_calculateGasInToken",
}

export enum AoriQuoterMethods {
    PriceQuote = "aori_priceQuote"
}

export enum SubscriptionEvents {
    QuoteRequested = "QuoteRequested",
    OrderCancelled = "OrderCancelled",
    TradeMatched = "TradeMatched",
    TradeSettled = "TradeSettled",
    TradeFailed = "TradeFailed",
    Sequenced = "Sequenced"
}

export interface DetailsToExecute {
    matching: AoriMatchingDetails;
    matchingSignature: string;

    chainId: number;
    zone: string;
    to: string;
    value: number;
    data: string;
    takerPermitSignature?: string;
}

export type AoriOrderWithOptionalOutputAmount = Omit<AoriOrder, "outputAmount"> & { outputAmount?: string };
export type WithEventDetails<TEvent, TDetails> = { tradeId: string, event: TEvent, data: TDetails, timestamp: number };

export type QuoteRequestedDetails = ({
    orderType: "rfq",
    takerOrder: AoriOrder,
    takerSignature: string,
    takerExtraData: string,

    order?: AoriOrder,
    extraData?: string,
} | {
    orderType: "limit",
    makerOrder: AoriOrder,
    makerSignature: string,
    makerExtraData: string,

    order?: AoriOrder,
    extraData?: string,
});
export type OrderCancelledDetails = ({ orderType: "rfq", takerOrder: AoriOrderWithOptionalOutputAmount } | { orderType: "limit", makerOrder: AoriOrder });
export type TradeMatchedDetails = { orderType: "rfq" | "limit" } & { makerOrder: AoriOrder, takerOrder: AoriOrder } & DetailsToExecute; // TODO: to deprecate
export type TradeSettledDetails = { orderType: "rfq" | "limit" } & {
    makerOrder?: AoriOrder, // TODO: to deprecate
    takerOrder?: AoriOrder, // TODO: to deprecate
    orderHash: string,
    order: AoriOrder,
    transactionHash: string,
    extraData: string,
};
export type TradeFailedDetails = { orderType: "rfq" | "limit" } & { makerOrder: AoriOrder, takerOrder: AoriOrder };
export type SequencedDetails = { orders: SignedOrder[]; extraData: string; witness: string; chainId: number; zone: string };

export type AoriWebsocketEventData = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [WithEventDetails<SubscriptionEvents.QuoteRequested, QuoteRequestedDetails>],
    [SubscriptionEvents.OrderCancelled]: [WithEventDetails<SubscriptionEvents.OrderCancelled, OrderCancelledDetails>],
    [SubscriptionEvents.TradeMatched]: [WithEventDetails<SubscriptionEvents.TradeMatched, TradeMatchedDetails>], // TODO: to deprecate
    [SubscriptionEvents.Sequenced]: [WithEventDetails<SubscriptionEvents.Sequenced, SequencedDetails>],
    [SubscriptionEvents.TradeSettled]: [WithEventDetails<SubscriptionEvents.TradeSettled, TradeSettledDetails>],
    [SubscriptionEvents.TradeFailed]: [WithEventDetails<SubscriptionEvents.TradeFailed, TradeFailedDetails>],
}
export type AoriEventData<T extends SubscriptionEvents = SubscriptionEvents> = AoriWebsocketEventData[T][0];
export type AoriEventDetails<T extends SubscriptionEvents = SubscriptionEvents> = AoriEventData<T>["data"];

export type TradeRecord = {
    tradeId: string;
    data: {
        // After QuoteRequested
        orderHash: string;
        order: AoriOrder;
        extraData: string;

        inputUsdValue?: number;
        outputUsdValue?: number;

        // After TradeMatched
        // matching?: AoriMatchingDetails;
        // matchingSignature?: string;
        // to?: string;
        // value?: number;
        // data?: string;
        // feeTag?: string;
        // feeRecipient?: string;
        // makerUsdValue?: number;
        // takerUsdValue?: number;

        // After TradeSettled
        transactionHash?: string;
    }
    events: {
        [key in SubscriptionEvents]?: number;
    }
}

/*//////////////////////////////////////////////////////////////
                        EVENT EMITTER DATA
//////////////////////////////////////////////////////////////*/

export class TypedEventEmitter<TEvents extends Record<string, any>> {
    private emitter = new EventEmitter()

    emit<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        ...eventArg: TEvents[TEventName]
    ) {
        this.emitter.emit(eventName, ...(eventArg as []))
    }

    on<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.emitter.on(eventName, handler as any)
    }

    off<TEventName extends keyof TEvents & string>(
        eventName: TEventName,
        handler: (...eventArg: TEvents[TEventName]) => void
    ) {
        this.emitter.off(eventName, handler as any)
    }
}