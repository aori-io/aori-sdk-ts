import { OrderToExecute, OrderView, QuoteRequested } from "./interfaces";

export enum AoriMethods {
    Ping = "aori_ping",
    AuthWallet = "aori_authWallet",
    ViewOrderbook = "aori_viewOrderbook",
    MakeOrder = "aori_makeOrder",
    CancelOrder = "aori_cancelOrder",
    TakeOrder = "aori_takeOrder",
    AccountOrders = "aori_accountOrders",
    OrderStatus = "aori_orderStatus",
    RequestQuote = "aori_requestQuote",
    GetCounter = "aori_getCounter",
    SendTransaction = "aori_sendTransaction",
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
    [NotificationEvents.OrderToExecute]: [orderToExecute: OrderToExecute],
    [NotificationEvents.QuoteRequested]: [quoteRequest: QuoteRequested],
    [AoriMethods.Ping]: ["aori_pong"],
    [AoriMethods.AuthWallet]: [jwt: string],
    [AoriMethods.ViewOrderbook]: [orders: OrderView[]],
    [AoriMethods.MakeOrder]: [orderHash: string],
    [AoriMethods.CancelOrder]: [orderHash: string],
    [AoriMethods.TakeOrder]: [orderHash: string],
    [AoriMethods.AccountOrders]: [orders: OrderView[]],
    [AoriMethods.OrderStatus]: [order: OrderView],
    [AoriMethods.GetCounter]: [{ counter: number, address: string, chainId: number }],
    [SubscriptionEvents.OrderCreated]: [order: OrderView],
    [SubscriptionEvents.OrderCancelled]: [order: OrderView],
    [SubscriptionEvents.OrderTaken]: [orderHash: OrderView],
    [SubscriptionEvents.OrderFulfilled]: [orderHash: string],
};