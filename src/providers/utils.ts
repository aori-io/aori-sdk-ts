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

export enum NotificationEvents {
    OrderToExecute = "OrderToExecute",
    QuoteRequested = "QuoteRequested",
}

export enum SubscriptionEvents {
    OrderCreated = "OrderCreated",
    OrderCancelled = "OrderCancelled",
    OrderTaken = "OrderTaken",
    OrderFulfilled = "OrderFulfilled",
}

export const ResponseEvents = { AoriMethods, NotificationEvents, SubscriptionEvents };

export type AoriMethodsEvents = {
    ["ready"]: [],
    ["error"]: [error: any],
    [NotificationEvents.OrderToExecute]: [orderToExecute: OrderToExecute],
    [NotificationEvents.QuoteRequested]: [quoteRequest: QuoteRequested],
    [AoriMethods.Ping]: ["aori_pong"],
    [AoriMethods.SupportedChains]: [chainIds: number[]],
    [AoriMethods.AuthWallet]: [jwt: string],
    [AoriMethods.CheckAuth]: [authed: boolean],
    [AoriMethods.ViewOrderbook]: [orders: OrderView[]],
    [AoriMethods.MakeOrder]: [orderHash: string],
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

    // 
    [_: string]: any
};