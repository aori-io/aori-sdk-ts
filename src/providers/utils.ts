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
    RequestQuote = "aori_requestQuote"
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
    [ResponseEvents.NotificationEvents.OrderToExecute]: [orderToExecute: OrderToExecute],
    [ResponseEvents.NotificationEvents.QuoteRequested]: [quoteRequest: QuoteRequested],
    [ResponseEvents.AoriMethods.ViewOrderbook]: [orders: OrderView[]],
    [ResponseEvents.AoriMethods.MakeOrder]: [orderHash: string],
    [ResponseEvents.AoriMethods.CancelOrder]: [orderHash: string],
    [ResponseEvents.AoriMethods.TakeOrder]: [orderHash: string],
    [ResponseEvents.AoriMethods.AccountOrders]: [orders: OrderView[]],
    [ResponseEvents.AoriMethods.OrderStatus]: [order: OrderView],
    [ResponseEvents.SubscriptionEvents.OrderCreated]: [order: OrderView],
    [ResponseEvents.SubscriptionEvents.OrderCancelled]: [orderHash: string],
    [ResponseEvents.SubscriptionEvents.OrderTaken]: [orderHash: string],
    [ResponseEvents.SubscriptionEvents.OrderFulfilled]: [orderHash: string],
};