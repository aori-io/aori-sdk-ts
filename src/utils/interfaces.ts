import { EventEmitter } from "events";
import { IAoriV2 } from "../types/AoriV2";

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

export interface BaseRfq {
    tradeId?: string;
    taker: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    recipient: string;
    zone: string;
    chainId: number;
    deadline: number;
}

export interface DetailsToExecute {
    matching: AoriMatchingDetails;
    matchingSignature: string;

    chainId: number;
    zone: string;
    to: string;
    value: number;
    data: string; // Default calldata if no hookdata or options being submitted
    takerPermitSignature?: string;
}

export type QuoteRequestedDetails = BaseRfq & { minOutputAmount?: string };
export type QuoteReceivedDetails = BaseRfq & { maker: string, outputAmount: string };
export type OrderCancelledDetails = BaseRfq & { maker: string };
export type TradeMatchedDetails = BaseRfq & { maker: string, outputAmount: string, detailsToExecute: DetailsToExecute }
export type TradeSettledDetails = BaseRfq & { maker: string, outputAmount: string, transactionHash: string };
export type TradeExpiredDetails = BaseRfq & { maker: string, outputAmount: string };

export type RfqEvents = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [QuoteRequestedDetails],
    [SubscriptionEvents.QuoteReceived]: [QuoteReceivedDetails],
    [SubscriptionEvents.OrderCancelled]: [OrderCancelledDetails],
    [SubscriptionEvents.TradeMatched]: [TradeMatchedDetails]
    [SubscriptionEvents.TradeSettled]: [TradeSettledDetails],
    [SubscriptionEvents.TradeFailed]: [TradeExpiredDetails],
}

export const ResponseEvents = { AoriMethods };

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