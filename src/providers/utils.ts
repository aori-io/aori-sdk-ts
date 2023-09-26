import { OrderToExecute, OrderView } from "./interfaces";

export enum AoriMethods {
    Ping = "aori_ping",
    AuthWallet = "aori_authWallet",
    ViewOrderbook = "aori_viewOrderbook",
    MakeOrder = "aori_makeOrder",
    CancelOrder = "aori_cancelOrder",
    TakeOrder = "aori_takeOrder",
    AccountOrders = "aori_accountOrders",
    OrderStatus = "aori_orderStatus"
}

export enum NotificationEvents {
    OrderToExecute = "OrderToExecute"
}

export enum SubscriptionEvents {
    OrderCreated = "OrderCreated",
    OrderCancelled = "OrderCancelled",
    OrderTaken = "OrderTaken",
    OrderFulfilled = "OrderFulfilled",
}

export const ResponseEvents = { AoriMethods, NotificationEvents, SubscriptionEvents };

export type AoriEvents = {
    [ResponseEvents.NotificationEvents.OrderToExecute]: (orderToExecute: OrderToExecute) => void,
    [ResponseEvents.AoriMethods.ViewOrderbook]: (orders: OrderView[]) => void,
    [ResponseEvents.AoriMethods.AccountOrders]: (orders: OrderView[]) => void,
    [ResponseEvents.AoriMethods.OrderStatus]: (order: OrderView) => void,
    [ResponseEvents.SubscriptionEvents.OrderCreated]: (order: OrderView) => void,
    [ResponseEvents.SubscriptionEvents.OrderCancelled]: (orderHash: string) => void,
    [ResponseEvents.SubscriptionEvents.OrderTaken]: (orderHash: string) => void,
    [ResponseEvents.SubscriptionEvents.OrderFulfilled]: (orderHash: string) => void,
}