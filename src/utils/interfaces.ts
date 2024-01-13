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

export interface OrderView {
    orderHash: string;

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

    makerOrder: AoriOrder;
    makerOrderHash: string;
    makerChainId: number;
    makerZone: string;

    takerOrder: AoriOrder;
    takerOrderHash: string;
    takerChainId: number;
    takerZone: string;

    chainId: number; // this is generally just takerChainId
    to: string;
    value: number;
    data: string;
    blockDeadline: number;

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
    AuthWallet = "aori_authWallet",
    CheckAuth = "aori_checkAuth",
    SupportedChains = "aori_supportedChains",
    ViewOrderbook = "aori_viewOrderbook",
    MakeOrder = "aori_makeOrder",
    CancelOrder = "aori_cancelOrder",
    TakeOrder = "aori_takeOrder",
    AccountOrders = "aori_accountOrders",
    AccountCredit = "aori_accountCredit",
    AccountBalance = "aori_accountBalance",
    OrderStatus = "aori_orderStatus",
    RequestQuote = "aori_requestQuote",
    GetCounter = "aori_getCounter",
    SendTransaction = "aori_sendTransaction",
    CancelAllOrders = "aori_cancelAllOrders",
}

export enum AoriDataMethods {
    Ping = "aori_ping",
    GetBlockNumber = "aori_getBlockNumber",
    GetNonce = "aori_getNonce",
    GetSeaportCounter = "aori_getSeaportCounter",
    GetSeatDetails = "aori_getSeatDetails",
    GetTokenAllowance = "aori_getTokenAllowance",
    GetTokenBalance = "aori_getTokenBalance",
    HasOrderSettled = "aori_hasOrderSettled",
    IsValidSignature = "aori_isValidSignature",
    GetGasData = "aori_getGasData",
    SendTransaction = "aori_sendTransaction",
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
    AoriMatchHistory = "aori_matchHistory",
    AoriGetMatchDetails = "aori_getMatchDetails",
}

export enum SubscriptionEvents {
    OrderCreated = "OrderCreated",
    OrderCancelled = "OrderCancelled",
    OrderTaken = "OrderTaken",
    OrderFulfilled = "OrderFulfilled",
    OrderToExecute = "OrderToExecute",
    QuoteRequested = "QuoteRequested",
}

export const ResponseEvents = { AoriMethods, SubscriptionEvents };

export type AoriMethodsEvents = {
    ["ready"]: [],
    ["error"]: [error: any],
    [AoriMethods.Ping]: ["aori_pong"],
    [AoriMethods.SupportedChains]: [chainIds: number[]],
    [AoriMethods.AuthWallet]: [jwt: string],
    [AoriMethods.CheckAuth]: [authed: boolean],
    [AoriMethods.ViewOrderbook]: [orders: OrderView[]],
    [AoriMethods.MakeOrder]: [order: OrderView],
    [AoriMethods.CancelOrder]: [orderHash: string],
    [AoriMethods.CancelAllOrders]: [],
    [AoriMethods.TakeOrder]: [orderHash: string],
    [AoriMethods.AccountOrders]: [orders: OrderView[]],
    [AoriMethods.AccountCredit]: [{ address: string, credit: string }],
    [AoriMethods.AccountBalance]: [{ address: string, token: string, chainId: number, balance: string }],
    [AoriMethods.OrderStatus]: [order: OrderView],
    [AoriMethods.GetCounter]: [{ cancelIndex: number, address: string, chainId: number }],
    [SubscriptionEvents.OrderCreated]: [order: OrderView],
    [SubscriptionEvents.OrderCancelled]: [order: OrderView],
    [SubscriptionEvents.OrderTaken]: [orderHash: OrderView],
    [SubscriptionEvents.OrderFulfilled]: [orderHash: string],
    [SubscriptionEvents.QuoteRequested]: [quoteRequest: QuoteRequested],
    [SubscriptionEvents.OrderToExecute]: [orderToExecute: DetailsToExecute],

    // 
    [_: string]: any
};