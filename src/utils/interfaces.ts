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

export interface AoriMatchingDetails {
    tradeId: string;
    
    makerOrder: AoriOrder;
    takerOrder: AoriOrder;

    makerSignature: string;
    takerSignature: string;

    feeTag: string;
    feeRecipient: string;
}

/*//////////////////////////////////////////////////////////////
                         METHOD TYPES
//////////////////////////////////////////////////////////////*/

export interface CreateLimitOrderParams {
    offerer: string;
    startTime?: number;
    endTime?: number;
    inputToken: string;
    inputAmount: bigint;
    outputToken: string;
    outputAmount: bigint;
    chainId: number;
    zone?: string;
    toWithdraw?: boolean;
}

/*//////////////////////////////////////////////////////////////
                            ENUMS
//////////////////////////////////////////////////////////////*/

export enum AoriMethods {
    Ping = "aori_ping",
    Version = "aori_version",
    SupportedChains = "aori_supportedChains",
    Rfq = "aori_rfq",
    Cancel = "aori_cancel",
    Respond = "aori_respond",
    Subscribe = "aori_subscribe",
    Fail = "aori_fail"
}

export enum AoriDataMethods {
    SendTransaction = "aori_sendTransaction",
    SimulateTransaction = "aori_simulateTransaction",
}

export enum AoriPricingMethods {
    CurrentGasInToken = "aori_currentGasInToken",
    GetToken = "aori_getToken",
    CalculateGasInToken = "aori_calculateGasInToken",
}

export enum SubscriptionEvents {
    QuoteRequested = "QuoteRequested",
    OrderCancelled = "OrderCancelled",
    QuoteReceived = "QuoteReceived",
    TradeMatched = "TradeMatched",
    TradeSettled = "TradeSettled",
    TradeFailed = "TradeFailed"
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

export type QuoteRequestedDetails = ({ orderType: "rfq", takerOrder: AoriOrderWithOptionalOutputAmount } | { orderType: "limit", makerOrder: AoriOrder });
export type OrderCancelledDetails = ({ orderType: "rfq", takerOrder: AoriOrderWithOptionalOutputAmount } | { orderType: "limit", makerOrder: AoriOrder });
export type QuoteReceivedDetails = ({ orderType: "rfq", takerOrder: AoriOrderWithOptionalOutputAmount } | { orderType: "limit", takerOrder: AoriOrder }) & ({ makerOrder: AoriOrder });
export type TradeMatchedDetails = { orderType: "rfq" | "limit" } & { makerOrder: AoriOrder, takerOrder: AoriOrder } & DetailsToExecute;
export type TradeSettledDetails = { orderType: "rfq" | "limit" } & { makerOrder: AoriOrder, takerOrder: AoriOrder, transactionHash: string };
export type TradeFailedDetails = { orderType: "rfq" | "limit" } & { makerOrder: AoriOrder, takerOrder: AoriOrder };

export type AoriWebsocketEventData = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [WithEventDetails<SubscriptionEvents.QuoteRequested, QuoteRequestedDetails>],
    [SubscriptionEvents.OrderCancelled]: [WithEventDetails<SubscriptionEvents.OrderCancelled, OrderCancelledDetails>],
    [SubscriptionEvents.QuoteReceived]: [WithEventDetails<SubscriptionEvents.QuoteReceived, QuoteReceivedDetails>],
    [SubscriptionEvents.TradeMatched]: [WithEventDetails<SubscriptionEvents.TradeMatched, TradeMatchedDetails>],
    [SubscriptionEvents.TradeSettled]: [WithEventDetails<SubscriptionEvents.TradeSettled, TradeSettledDetails>],
    [SubscriptionEvents.TradeFailed]: [WithEventDetails<SubscriptionEvents.TradeFailed, TradeFailedDetails>],
}
export type AoriEventData<T extends SubscriptionEvents> = AoriWebsocketEventData[T][0]["data"];

export type TradeRecord = {
    tradeId: string;
    data: {
        // After QuoteRequested
        orderType: "rfq" | "limit";
        takerOrder?: AoriOrderWithOptionalOutputAmount;
        makerOrder?: AoriOrder;

        // After TradeMatched
        matching?: AoriMatchingDetails;
        matchingSignature?: string;
        to?: string;
        value?: number;
        data?: string;
        feeTag?: string;
        feeRecipient?: string;
        makerUsdValue?: number;
        takerUsdValue?: number;

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