import { EventEmitter } from "events";

/*//////////////////////////////////////////////////////////////
                         NATIVE TYPES
//////////////////////////////////////////////////////////////*/

export interface AoriOrder {
    offerer: string;
    inputToken: string;
    inputAmount: string;
    inputChainId: number;
    inputZone: string;
    outputToken: string;
    outputAmount: string;
    outputChainId: number;
    outputZone: string;
    startTime: string;
    endTime: string;
    salt: string;
    counter: number;
    toWithdraw: boolean;
}

export interface AoriMatchingDetails {
    makerOrder: AoriOrder;
    takerOrder: AoriOrder;

    makerSignature: string;
    takerSignature: string;
    blockDeadline: number;

    seatNumber: number;
    seatHolder: string;
    seatPercentOfFees: number;
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

export interface DetailsToExecute {
    matchingHash: string;
    matching: AoriMatchingDetails;
    matchingSignature: string;

    makerOrderHash: string;
    makerChainId: number;
    makerZone: string;

    takerOrderHash: string;
    takerChainId: number;
    takerZone: string;

    chainId: number; // this is generally just takerChainId
    to: string;
    value: number;
    data: string; // Default calldata if no hookdata or options being submitted
    takerPermitSignature?: string;

    maker: string;
    taker: string;

    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
}

export interface SettledMatch {
    makerOrderHash?: string;
    takerOrderHash?: string;
    maker: string;
    taker: string;
    inputChainId: number;
    outputChainId: number;
    inputZone: string;
    outputZone: string;
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    outputAmount: string;
    matchingHash: string;

    // Details from the input chain
    transactionHash?: string;
    blockNumber?: number;
    timestamp?: number;
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
    Subscribe = "aori_subscribe"
}

export enum AoriDataMethods {
    Ping = "aori_ping",
    SupportedChains = "aori_supportedChains",
    Create3Address = "aori_create3Address",
    IsContract = "aori_isContract",
    GetAoriCounter = "aori_getAoriCounter",
    GetBlockNumber = "aori_getBlockNumber",
    GetNonce = "aori_getNonce",
    GetSeaportCounter = "aori_getSeaportCounter",
    GetSeatDetails = "aori_getSeatDetails",
    GetSeatOwned = "aori_getSeatOwned",
    GetOrderHash = "aori_getOrderHash",
    GetTokenBalance = "aori_getTokenBalance",
    GetTokenDetails = "aori_getTokenDetails",
    GetTokenAllowance = "aori_getTokenAllowance",
    GetNativeBalance = "aori_getNativeBalance",
    HasOrderSettled = "aori_hasOrderSettled",
    IsValidSignature = "aori_isValidSignature",
    GetFeeData = "aori_getFeeData",
    EstimateGas = "aori_estimateGas",
    SendTransaction = "aori_sendTransaction",
    SimulateTransaction = "aori_simulateTransaction",
    StaticCall = "aori_staticCall"
}

export enum AoriPricingMethods {
    CurrentGasInToken = "aori_currentGasInToken",
    GetToken = "aori_getToken",
    CalculateGasInToken = "aori_calculateGasInToken",
}

export enum SubscriptionEvents {
    QuoteRequested = "QuoteRequested",
    QuoteReceived = "QuoteReceived",
    CalldataToExecute = "CalldataToExecute",
}

export interface QuoteRequestedDetails {
    rfqId: string,
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    zone: string,
    chainId: number
}

export type RfqEvents = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [QuoteRequestedDetails],
    [SubscriptionEvents.QuoteReceived]: [QuoteRequestedDetails & { outputAmount: string }],
    [SubscriptionEvents.CalldataToExecute]: [{ rfqId: string, detailsToExecute: DetailsToExecute }]
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