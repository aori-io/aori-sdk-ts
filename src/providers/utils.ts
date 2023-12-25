import { OrderToExecute, OrderView, QuoteRequested } from "./interfaces";

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
    [SubscriptionEvents.OrderToExecute]: [orderToExecute: OrderToExecute],

    // 
    [_: string]: any
};