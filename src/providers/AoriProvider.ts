import { JsonRpcProvider, Wallet, ZeroAddress } from "ethers";
import TypedEmitter from "typed-emitter";
import { EventEmitter, WebSocket } from "ws";
import { OrderWithCounter } from "../utils/helpers";
import { ViewOrderbookQuery } from "./interfaces";
import { AoriEvents, AoriMethods, NotificationEvents, ResponseEvents, SubscriptionEvents } from "./utils";

export abstract class AoriProvider extends (EventEmitter as new () => TypedEmitter<AoriEvents>) {
    actionsWebsocket: WebSocket;
    subscriptionsWebsocket: WebSocket
    wallet: Wallet;
    provider: JsonRpcProvider;
    apiKey: string = "";
    counter: number = 0;

    jwt: string = ""; // Not needed at the moment
    messages: { [counter: number]: AoriMethods }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor(actionsWebsocket: WebSocket, subscriptionsWebsocket: WebSocket, wallet: Wallet, provider: JsonRpcProvider, apiKey?: string) {
        super();

        this.actionsWebsocket = actionsWebsocket;
        this.subscriptionsWebsocket = subscriptionsWebsocket;
        this.wallet = wallet;
        this.messages = {};
        this.provider = provider;
        if (apiKey) this.apiKey = apiKey;

        this.actionsWebsocket.on("message", (msg) => {
            const { id, result, error } = JSON.parse(msg.toString());

            // TODO: handle errors more gracefully
            if (error) {
                console.log(error);
                throw error;
            }

            switch (this.messages[id]) {
                case AoriMethods.AuthWallet:
                    this.jwt = result.auth;
                    break;
                case AoriMethods.ViewOrderbook:
                    this.emit(ResponseEvents.AoriMethods.ViewOrderbook, result.orders);
                    break;
                case AoriMethods.AccountOrders:
                    this.emit(ResponseEvents.AoriMethods.AccountOrders, result.orders);
                    break;
                case AoriMethods.OrderStatus:
                    this.emit(ResponseEvents.AoriMethods.OrderStatus, result.order);
                    break;
                case null:
                    // This is a notification
                    const { type, data } = result;

                    switch (type) {
                        case NotificationEvents.OrderToExecute:
                            this.emit(ResponseEvents.NotificationEvents.OrderToExecute, data);
                            break;
                        default:
                            break;
                    }
                    break;

                default:
                    break;
            }
        });

        this.subscriptionsWebsocket.on("message", (msg) => {
            const { id, result } = JSON.parse(msg.toString());
            const { type, data } = result;

            switch (type) {
                case SubscriptionEvents.OrderCreated:
                    this.emit(ResponseEvents.SubscriptionEvents.OrderCreated, data);
                    break;
                case SubscriptionEvents.OrderCancelled:
                    this.emit(ResponseEvents.SubscriptionEvents.OrderCancelled, data);
                    break;
                case SubscriptionEvents.OrderTaken:
                    this.emit(ResponseEvents.SubscriptionEvents.OrderTaken, data);
                    break;
                case SubscriptionEvents.OrderFulfilled:
                    this.emit(ResponseEvents.SubscriptionEvents.OrderFulfilled, data);
                    break;
            }
        });
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async initialise(...any: any[]): Promise<void> { }

    /*//////////////////////////////////////////////////////////////
                                ACTIONS
    //////////////////////////////////////////////////////////////*/

    async authWallet() {
        const { address } = this.wallet;
        const signature = this.wallet.signMessageSync(address);
        const id = this.counter;

        this.messages[id] = AoriMethods.AuthWallet;
        this.actionsWebsocket.send(JSON.stringify({
            jsonrpc: "2.0",
            id,
            method: AoriMethods.AuthWallet,
            params: [{
                address,
                signature
            }]
        }));
        this.counter++;
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<void> {
        const id = this.counter;
        this.messages[id] = AoriMethods.ViewOrderbook;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method: AoriMethods.ViewOrderbook,
            params: query != undefined ? [query] : []
        }));
        this.counter++;
    }

    async accountOrders() {
        const offerer = this.wallet.address;
        const signature = this.wallet.signMessageSync(offerer);
        const id = this.counter;

        this.messages[id] = AoriMethods.AccountOrders;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method: AoriMethods.AccountOrders,
            params: [{
                offerer,
                signature
            }]
        }));
        this.counter++;
    }

    async orderStatus(orderHash: string) {
        const id = this.counter;
        this.messages[id] = AoriMethods.OrderStatus;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method: AoriMethods.OrderStatus,
            params: [{
                orderHash
            }]
        }));
        this.counter++;
    }

    async makeOrder({ order, chainId }: { order: OrderWithCounter, chainId: number }) {
        const id = this.counter;
        this.messages[id] = AoriMethods.MakeOrder;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method: AoriMethods.MakeOrder,
            params: [{
                order,
                apiKey: this.apiKey,
                signer: ZeroAddress,
                isPublic: true,
                chainId,
            }]
        }));
        this.counter++;
    }

    async takeOrder({ orderId, order }: { orderId: string, order: OrderWithCounter }) {
        const id = this.counter;
        this.messages[id] = AoriMethods.TakeOrder;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method: AoriMethods.TakeOrder,
            params: [{
                orderId,
                order
            }]
        }));
        this.counter++;
    }

    async cancelOrder(orderHash: string, signature: string) {
        const id = this.counter;
        this.messages[id] = AoriMethods.CancelOrder;
        this.actionsWebsocket.send(JSON.stringify({
            jsonrpc: "2.0",
            id,
            method: AoriMethods.CancelOrder,
            params: [{
                orderId: orderHash,
                signature
            }]
        }));
        this.counter++;
    }
}