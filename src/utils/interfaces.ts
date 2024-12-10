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

/*//////////////////////////////////////////////////////////////
                            ENUMS
//////////////////////////////////////////////////////////////*/

export enum AoriMethods {
    Ping = "aori_ping",
    Version = "aori_version",
    SupportedChains = "aori_supportedChains",
    Rfq = "aori_rfq",
    Subscribe = "aori_subscribe",
    // =====
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
    TradeSettled = "TradeSettled",
    TradeFailed = "TradeFailed",
    Sequenced = "Sequenced"
}

export type WithEventDetails<TEvent, TDetails> = { tradeId: string, event: TEvent, data: TDetails, timestamp: number };

export type QuoteRequestedDetails = {
    // TODO: add in zone and chainId
    orderHash: string,
    order: AoriOrder,
    extraData: string,
    signature: string,
};

export type OrderCancelledDetails = {
    orderHash: string,
    order: AoriOrder,
    extraData: string
};

export type TradeSettledDetails = {
    orderHash: string,
    order: AoriOrder,
    extraData: string,
    transactionHash: string,
};

export type TradeFailedDetails = {
    orderHash: string,
    order: AoriOrder,
    extraData: string
};

export type SequencedDetails = {
    orders: SignedOrder[];
    extraData: string;
    witness: string;
    chainId: number;
    zone: string;
};

export type AoriWebsocketEventData = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [WithEventDetails<SubscriptionEvents.QuoteRequested, QuoteRequestedDetails>],
    [SubscriptionEvents.OrderCancelled]: [WithEventDetails<SubscriptionEvents.OrderCancelled, OrderCancelledDetails>],
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
        signature: string;

        inputUsdValue?: number;
        outputUsdValue?: number;

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