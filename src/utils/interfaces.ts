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

export interface QuoteRequested {
    inputToken: string;
    outputToken: string;
    inputAmount?: string;
    outputAmount?: string;
    chainId: number;
}

export type AoriOrderWithIntegerTimes = Omit<AoriOrder, "startTime" | "endTime"> & { startTime: number, endTime: number };

export interface OrderView {
    orderHash: string;
    offerer: string;

    order: AoriOrder;
    signature?: string;

    inputToken: string;
    inputAmount: string;
    inputChainId: number;
    inputZone: string;

    outputToken: string;
    outputAmount: string;
    outputChainId: number;
    outputZone: string;

    rate: number;
    createdAt: number;
    lastUpdatedAt: number;
    takenAt?: number;
    cancelledAt?: number;
    fulfilledAt?: number;
    systemCancelled?: boolean;

    isActive: boolean;
    isPublic: boolean;
    tag?: string;
}

export interface ViewOrderbookQuery {
    signature?: string;
    offerer?: string;
    orderHash?: string;
    query?: {
        base: string;
        quote: string;
    };
    chainId?: number;
    sortBy?: "createdAt_asc" | "createdAt_desc" | "rate_asc" | "rate_desc";
    inputAmount?: string;
    outputAmount?: string;
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

/*//////////////////////////////////////////////////////////////
                            ENUMS
//////////////////////////////////////////////////////////////*/

export enum AoriMethods {
    Ping = "aori_ping",
    Version = "aori_version",
    SupportedChains = "aori_supportedChains",
    ViewOrderbook = "aori_viewOrderbook",
    MakeOrder = "aori_makeOrder",
    CancelOrder = "aori_cancelOrder",
    CancelAllOrders = "aori_cancelAllOrders",
    TakeOrder = "aori_takeOrder",
    AccountDetails = "aori_accountDetails",
    AccountBalance = "aori_accountBalance",
    Quote = "aori_quote",
    RequestQuote = "aori_requestQuote"
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
    GetAssetPrice = "aori_getAssetPrice",
    CalculateGasInToken = "aori_calculateGasInToken",
}

export enum AoriSolutionStoreMethods {
    SaveSolution = "aori_saveSolution",
    GetSolution = "aori_getSolution",
}

export enum AoriMempoolProviderMethods {
    AoriPing = "aori_ping",
    AoriSupportedChains = "aori_supportedChains",
    AoriViewMatches = "aori_viewMatches",
    AoriSubmitMatch = "aori_submitMatch",
}

export enum SubscriptionEvents {
    OrderCreated = "OrderCreated",
    OrderCancelled = "OrderCancelled",
    OrderTaken = "OrderTaken",
    OrderFulfilled = "OrderFulfilled",
    OrderToExecute = "OrderToExecute",
    QuoteRequested = "QuoteRequested",
}
export type FeedEvents = SubscriptionEvents;

export const ResponseEvents = { AoriMethods, SubscriptionEvents };

export type AoriMethodsEvents = {
    ["ready"]: [],
    ["error"]: [error: any],
    [AoriMethods.Ping]: ["aori_pong"],
    [AoriMethods.SupportedChains]: [chainIds: number[]],
    [AoriMethods.ViewOrderbook]: [orders: OrderView[]],
    [AoriMethods.MakeOrder]: [order: OrderView],
    [AoriMethods.CancelOrder]: [orderHash: string],
    [AoriMethods.CancelAllOrders]: [],
    [AoriMethods.TakeOrder]: [orderToExecute: DetailsToExecute | string],
    [AoriMethods.AccountDetails]: [{ assignedAddress: string, credit: string, orders: OrderView[] }],
    [AoriMethods.AccountBalance]: [{ address: string, token: string, chainId: number, balance: string }],
    [AoriMethods.RequestQuote]: [],
    [AoriMethods.Quote]: [orders: OrderView[]]

    // 
    [_: string]: any
};

export type AoriFeedEvents = {
    ["ready"]: [],
    ["error"]: [error: any],
    [SubscriptionEvents.OrderCreated]: [order: OrderView],
    [SubscriptionEvents.OrderCancelled]: [order: OrderView],
    [SubscriptionEvents.OrderTaken]: [orderHash: OrderView],
    [SubscriptionEvents.OrderFulfilled]: [orderHash: string],
    [SubscriptionEvents.QuoteRequested]: [quoteRequest: QuoteRequested],
    [SubscriptionEvents.OrderToExecute]: [orderToExecute: DetailsToExecute],

    // 
    [_: string]: any
}