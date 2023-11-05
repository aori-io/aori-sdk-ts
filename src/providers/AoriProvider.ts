import { ItemType } from "@opensea/seaport-js/lib/constants";
import { BigNumberish, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { actionsURL, subscriptionsURL } from "../utils";
import { formatIntoLimitOrder, OrderWithCounter, signOrder } from "../utils/helpers";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { OrderView, ViewOrderbookQuery } from "./interfaces";
import { AoriMethods, AoriMethodsEvents, NotificationEvents, SubscriptionEvents } from "./utils";
export class AoriProvider extends TypedEventEmitter<AoriMethodsEvents> {
    actionsWebsocket: WebSocket;
    subscriptionsWebsocket: WebSocket;
    wallet: Wallet;
    apiKey: string = "";
    counter: number = 0;
    cancelIndex: number = 0;

    jwt: string = ""; // Not needed at the moment
    messages: { [counter: number]: AoriMethods | string }

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        requestsFeed,
        subscriptionFeed,
        apiKey,
        useVirtualOrders = true
    }: {
        wallet: Wallet,
        requestsFeed: WebSocket,
        subscriptionFeed: WebSocket,
        apiKey?: string,
        useVirtualOrders?: boolean
    }) {
        super();

        this.wallet = wallet;
        this.actionsWebsocket = requestsFeed;
        this.subscriptionsWebsocket = subscriptionFeed;

        this.messages = {};
        if (apiKey) this.apiKey = apiKey;

        this.actionsWebsocket.on("open", () => {
            if (useVirtualOrders) this.authWallet();
            this.emit("ready");
        });

        this.actionsWebsocket.on("message", (msg) => {
            const { id, result, error } = JSON.parse(msg.toString());

            if (error) {
                console.log(error);
                this.emit("error", error.toString());
                return;
            }

            switch (this.messages[id] || null) {
                case AoriMethods.Ping:
                    console.log(`Received ${result} back`);
                    this.emit(AoriMethods.Ping, "aori_pong");
                    break;
                case AoriMethods.AuthWallet:
                    this.jwt = result.auth;
                    this.emit(AoriMethods.AuthWallet, result.auth);
                    break;
                case AoriMethods.SupportedChains:
                    this.emit(AoriMethods.SupportedChains, result);
                    break;
                case AoriMethods.GetCounter:
                    this.cancelIndex = result.counter;
                    this.emit(AoriMethods.GetCounter, {
                        cancelIndex: result.counter,
                        address: result.address,
                        chainId: result.chainId
                    });
                    break;
                case AoriMethods.ViewOrderbook:
                    this.emit(AoriMethods.ViewOrderbook, result.orders);
                    break;
                case AoriMethods.MakeOrder:
                    this.emit(AoriMethods.MakeOrder, result.orderHash);
                    break;
                case AoriMethods.CancelOrder:
                    this.emit(AoriMethods.CancelOrder, result.orderHash);
                    break;
                case AoriMethods.TakeOrder:
                    this.emit(AoriMethods.TakeOrder, result.orderHash);
                    break;
                case AoriMethods.AccountOrders:
                    this.emit(AoriMethods.AccountOrders, result.orders);
                    break;
                case AoriMethods.OrderStatus:
                    this.emit(AoriMethods.OrderStatus, result.order);
                    break;
                case null:
                    // This is a notification
                    const { type, data } = result;

                    switch (type) {
                        case NotificationEvents.OrderToExecute:
                            this.emit(NotificationEvents.OrderToExecute, data);
                            break;
                        case NotificationEvents.QuoteRequested:
                            this.emit(NotificationEvents.QuoteRequested, data);
                        default:
                            console.error(`Unexpected notification event: ${type}`);
                            break;
                    }
                    break;

                default:
                    this.emit(this.messages[id], result);
                    break;
            }
        });

        this.subscriptionsWebsocket.on("message", (msg) => {
            const { id, result } = JSON.parse(msg.toString());
            const { type, data } = result;

            switch (type) {
                case SubscriptionEvents.OrderCreated:
                    this.emit(SubscriptionEvents.OrderCreated, data);
                    break;
                case SubscriptionEvents.OrderCancelled:
                    this.emit(SubscriptionEvents.OrderCancelled, data);
                    break;
                case SubscriptionEvents.OrderTaken:
                    this.emit(SubscriptionEvents.OrderTaken, data);
                    break;
                case SubscriptionEvents.OrderFulfilled:
                    this.emit(SubscriptionEvents.OrderFulfilled, data);
                    break;
            }
        });
    }

    static default({ wallet }: { wallet: Wallet }): AoriProvider {
        return new AoriProvider({
            wallet,
            requestsFeed: new WebSocket(actionsURL),
            subscriptionFeed: new WebSocket(subscriptionsURL)
        })
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async initialise(...any: any[]): Promise<void> { }

    async createLimitOrder({
        offerer = this.wallet.address,
        inputToken,
        inputTokenType = ItemType.ERC20,
        inputAmount,
        outputToken,
        outputTokenType = ItemType.ERC20,
        outputAmount,
        chainId = 5
    }: {
        offerer?: string;
        inputToken: string;
        inputTokenType?: ItemType;
        inputAmount: BigNumberish;
        outputToken: string;
        outputTokenType?: ItemType;
        outputAmount: BigNumberish;
        chainId?: string | number;
    }) {
        const limitOrder = await formatIntoLimitOrder({
            offerer,
            inputToken,
            inputTokenType,
            inputAmount,
            outputToken,
            outputTokenType,
            outputAmount,
            chainId,
            counter: `${this.cancelIndex}`
        });
        limitOrder.signature = await signOrder(this.wallet, limitOrder, chainId);
        return limitOrder;
    }

    async createMatchingOrder({
        inputToken,
        inputAmount,
        outputToken,
        outputAmount,
        chainId = 5
    }: OrderView) {
        const matchingOrder = await formatIntoLimitOrder({
            offerer: this.wallet.address,
            inputToken: outputToken,
            inputAmount: outputAmount,
            outputToken: inputToken,
            outputAmount: inputAmount,
            chainId,
            counter: `${this.cancelIndex}`
        });

        matchingOrder.signature = await signOrder(this.wallet, matchingOrder, chainId);
        return matchingOrder;
    }

    /*//////////////////////////////////////////////////////////////
                                ACTIONS
    //////////////////////////////////////////////////////////////*/

    async ping() {
        await this.rawCall({
            method: AoriMethods.Ping,
            params: []
        });
    }

    async authWallet() {
        const { address } = this.wallet;

        await this.rawCall({
            method: AoriMethods.AuthWallet,
            params: [{
                address,
                signature: this.wallet.signMessageSync(address)
            }]
        })
    }

    async checkAuth({ auth }: { auth: string }) {
        await this.rawCall({
            method: AoriMethods.CheckAuth,
            params: [{
                auth
            }]
        })
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<void> {
        await this.rawCall({
            method: AoriMethods.ViewOrderbook,
            params: query != undefined ? [query] : []
        });
    }

    async accountOrders() {
        const offerer = this.wallet.address;
        await this.rawCall({
            method: AoriMethods.AccountOrders,
            params: [{
                offerer,
                signature: this.wallet.signMessageSync(offerer)
            }]
        });
    }

    async accountCredit() {
        const { address } = this.wallet;
        await this.rawCall({
            method: AoriMethods.AccountCredit,
            params: [{
                address,
                signature: this.wallet.signMessageSync(address)
            }]
        })
    }

    async orderStatus(orderHash: string) {
        await this.rawCall({
            method: AoriMethods.OrderStatus,
            params: [{
                orderHash
            }]
        });
    }

    async makeOrder({ order, chainId }: { order: OrderWithCounter, chainId: number }) {
        await this.rawCall({
            method: AoriMethods.MakeOrder,
            params: [{
                order,
                apiKey: this.apiKey,
                signer: ZeroAddress,
                isPublic: true,
                chainId,
            }]
        });
    }

    async takeOrder({ orderId, order, chainId }: { orderId: string, order: OrderWithCounter, chainId: number }) {
        await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order,
                chainId,
                orderId
            }]
        })
    }

    async cancelOrder(orderHash: string, signature: string) {
        await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderId: orderHash,
                signature
            }]
        });
    }

    async requestQuote({ inputToken, inputAmount, outputToken, chainId }: { inputToken: string, inputAmount: BigNumberish, outputToken: string, chainId: number }) {
        await this.rawCall({
            method: AoriMethods.RequestQuote,
            params: [{
                apiKey: (this.jwt != undefined) ? this.jwt : this.apiKey,
                inputToken,
                inputAmount,
                outputToken,
                chainId
            }]
        })
    }

    async getCounter({ address, chainId }: { address: string, chainId: number }) {
        await this.rawCall({
            method: AoriMethods.GetCounter,
            params: [{
                address,
                chainId
            }]
        })
    }

    async sendTransaction({ to, value, data }: { to: string, value: BigNumberish, data: string }) {
        const signedTx = await this.wallet.signTransaction({ to, value, data });

        await this.rawCall({
            method: AoriMethods.SendTransaction,
            params: [{ signedTx }]
        });
    }

    async rawCall<T>({ method, params }: { method: AoriMethods | string, params: [T] | [] }) {
        const id = this.counter;
        this.messages[id] = method;
        this.actionsWebsocket.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method,
            params
        }));
        this.counter++;
    }
}