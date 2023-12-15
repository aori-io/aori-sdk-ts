import { ItemType } from "@opensea/seaport-js/lib/constants";
import axios from "axios";
import { BigNumberish, formatEther, getBytes, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { AORI_API, AORI_DATA_PROVIDER_API, AORI_FEED, AORI_TAKER_API, AORI_ZONE_ADDRESS, connectTo, getOrderHash, signOrder } from "../utils";
import { formatIntoLimitOrder, OrderWithCounter } from "../utils/helpers";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { ViewOrderbookQuery } from "./interfaces";
import { AoriMethods, AoriMethodsEvents, SubscriptionEvents } from "./utils";
export class AoriProvider extends TypedEventEmitter<AoriMethodsEvents> {

    apiUrl: string;
    feedUrl: string;
    takerUrl: string;

    api: WebSocket = null as any;
    feed: WebSocket = null as any;

    wallet: Wallet;
    apiKey: string = "";
    vaultContract?: string;
    counter: number = 0;
    cancelIndex: number = 0;
    seatId: number = 0;

    messages: { [counter: number]: AoriMethods | string }
    keepAlive: boolean;
    keepAliveTimer: NodeJS.Timeout;
    defaultChainId: number;
    readyLatch: boolean = false;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        apiUrl = AORI_API,
        feedUrl = AORI_FEED,
        takerUrl = AORI_TAKER_API,
        vaultContract,
        apiKey,
        keepAlive = true,
        defaultChainId = 5,
        seatId = 0
    }: {
        wallet: Wallet,
        apiUrl?: string,
        feedUrl?: string,
        takerUrl?: string,
        vaultContract?: string,
        apiKey?: string,
        keepAlive?: boolean,
        defaultChainId?: number,
        seatId?: number
    }) {
        super();

        this.wallet = wallet;
        this.apiUrl = apiUrl;
        this.feedUrl = feedUrl;
        this.takerUrl = takerUrl;
        this.seatId = seatId;
        this.defaultChainId = defaultChainId;

        this.messages = {};
        if (vaultContract) this.vaultContract = vaultContract;
        if (apiKey) this.apiKey = apiKey;

        this.keepAlive = keepAlive;
        this.keepAliveTimer = null as any;

        console.log("🤖 Creating an Aori Provider Instance");
        console.log("==================================================================");
        console.log(`> Executor Wallet: ${wallet.address}`);
        if (vaultContract) console.log(`> Vault Contract: ${vaultContract}`);
        console.log(`> API URL: ${apiUrl}`);
        console.log(`> Feed URL: ${feedUrl}`);
        console.log(`> Seat Id: ${seatId} (read more about seats at seats.aori.io)`);
        console.log(`> Default Chain ID: ${defaultChainId}`);
        console.log("==================================================================");

        console.log(`🔌 Connecting via WebSocket to ${apiUrl}...`);
        this.connect();
    }

    static default({ wallet }: { wallet: Wallet }): AoriProvider {
        return new AoriProvider({ wallet })
    }

    async connect() {
        if (this.api) this.api.close();
        if (this.feed) this.feed.close();

        this.api = connectTo(this.apiUrl);
        this.feed = connectTo(this.feedUrl);

        this.readyLatch = false;

        this.api.on("open", () => {
            console.log(`⚡ Connected to ${this.apiUrl}`);
            if (this.keepAlive) {
                this.keepAliveTimer = setInterval(() => {
                    this.api.ping();
                    this.feed.ping();
                }, 10_000);
            }
            if (!this.readyLatch) {
                this.readyLatch = true;
            } else {
                this.emit("ready");
            }
        });

        this.api.on("message", (msg) => {
            const { id, result, error } = JSON.parse(msg.toString());

            if (error) {
                console.log(error);
                this.emit("error", error);
                return;
            }

            switch (this.messages[id] || null) {
                case AoriMethods.Ping:
                    console.log(`Received ${result} back`);
                    this.emit(AoriMethods.Ping, "aori_pong");
                    break;
                case AoriMethods.AuthWallet:
                    this.emit(AoriMethods.AuthWallet, result.auth);
                    break;
                case AoriMethods.CheckAuth:
                    this.emit(AoriMethods.CheckAuth, result);
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
                case AoriMethods.CancelAllOrders:
                    this.emit(AoriMethods.CancelAllOrders);
                    break;
                default:
                    this.emit(this.messages[id], result);
                    break;
            }
        });

        this.api.on("close", () => {
            console.log(`Got disconnected...`);
            setTimeout(() => {
                console.log(`Reconnecting...`);
                this.connect();
            }, 5_000);
            this.readyLatch = false;
        });

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.feedUrl}`);

            if (!this.readyLatch) {
                this.readyLatch = true;
            } else {
                this.emit("ready");
                console.log(`🫡 Provider ready to send requests`);
            }
        });

        this.feed.on("message", (msg) => {
            const { id, result } = JSON.parse(msg.toString());
            const { type, data } = result;

            switch (type) {
                case AoriMethods.Ping:
                    console.log(`🏓 Sent ping, got pong from ${this.feedUrl}`);
                    break;
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
                case SubscriptionEvents.OrderToExecute:
                    this.emit(SubscriptionEvents.OrderToExecute, data);
                    break;
                case SubscriptionEvents.QuoteRequested:
                    this.emit(SubscriptionEvents.QuoteRequested, data);
            }
        });

        this.feed.on("close", () => {
            console.log(`Got disconnected...`);
            setTimeout(() => {
                console.log(`Reconnecting...`);
                this.connect();
            }, 5_000);
            this.readyLatch = false;
        });
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async initialise(...any: any[]): Promise<void> { }

    terminate() {
        if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); }
        this.api.close();
        this.feed.close();
    }

    setDefaultChainId(chainId: number) {
        this.defaultChainId = chainId;
    }

    async createLimitOrder({
        offerer = (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
        zone = AORI_ZONE_ADDRESS,
        inputToken,
        inputTokenType = ItemType.ERC20,
        inputAmount,
        outputToken,
        outputTokenType = ItemType.ERC20,
        outputAmount,
        chainId = this.defaultChainId
    }: {
        offerer?: string;
        zone?: string;
        inputToken: string;
        inputTokenType?: ItemType;
        inputAmount: bigint | string;
        outputToken: string;
        outputTokenType?: ItemType;
        outputAmount: bigint | string;
        chainId?: string | number;
    }) {
        const limitOrder = await formatIntoLimitOrder({
            offerer,
            zone,
            inputToken,
            inputTokenType,
            inputAmount: BigInt(inputAmount),
            outputToken,
            outputTokenType,
            outputAmount: BigInt(outputAmount),
            counter: `${this.cancelIndex}`
        });
        await this.signOrder(limitOrder, chainId);
        return {
            ...limitOrder,
            orderHash: getOrderHash(limitOrder.parameters, this.cancelIndex)
        };
    }

    async createMatchingOrder({
        order: { parameters },
        chainId = this.defaultChainId,
    }: {
        order: OrderWithCounter,
        chainId: number
    }, feeInBips = 3n) {
        const matchingOrder = await formatIntoLimitOrder({
            offerer: (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
            zone: parameters.zone,
            inputToken: parameters.consideration[0].token,
            inputAmount: BigInt(parameters.consideration[0].startAmount) * (10000n + feeInBips) / 10000n,
            outputToken: parameters.offer[0].token,
            outputAmount: BigInt(parameters.offer[0].startAmount),
            counter: `${this.cancelIndex}`
        });

        await this.signOrder(matchingOrder, chainId);
        return {
            ...matchingOrder,
            orderHash: getOrderHash(matchingOrder.parameters, this.cancelIndex)
        };
    }

    async signOrder(order: OrderWithCounter, chainId: string | number = this.defaultChainId) {
        const signature = await signOrder(this.wallet, order.parameters, chainId);
        order.signature = signature;
        return signature;
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
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(address)
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
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(offerer)
            }]
        });
    }

    async accountBalance(token: string, chainId: number = this.defaultChainId) {
        const { address } = this.wallet;
        await this.rawCall({
            method: AoriMethods.AccountBalance,
            params: [{
                address,
                token,
                chainId,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(address)
            }]
        })
    }

    async accountCredit() {
        const { address } = this.wallet;
        await this.rawCall({
            method: AoriMethods.AccountCredit,
            params: [{
                address,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(address)
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

    async makeOrder({ order: { parameters, signature }, chainId = this.defaultChainId, isPrivate = false }: { order: OrderWithCounter, chainId?: number, isPrivate?: boolean }) {
        console.log(`💹 Placing Limit Order to ${this.apiUrl}`);
        console.log(this.formatOrder({ parameters, signature }, chainId));
        await this.rawCall({
            method: AoriMethods.MakeOrder,
            params: [{
                order: { parameters, signature },
                apiKey: this.apiKey,
                signer: ZeroAddress,
                isPublic: !isPrivate,
                chainId,
            }]
        });
    }

    async takeOrder({ orderHash, order: { parameters, signature }, chainId = this.defaultChainId, seatId = this.seatId }: { orderHash: string, order: OrderWithCounter, chainId?: number, seatId?: number }) {
        console.log(`💹 Attempting to Take ${orderHash} on ${this.apiUrl}`);
        console.log(this.formatOrder({ parameters, signature }, chainId));
        await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order: { parameters, signature },
                chainId,
                orderId: orderHash,
                seatId
            }]
        })
    }

    async cancelOrder(orderHash: string) {
        await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderId: orderHash,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(orderHash)) : this.wallet.signMessageSync(orderHash)
            }]
        });
    }

    async cancelAllOrders() {
        await this.rawCall({
            method: AoriMethods.CancelAllOrders,
            params: [{
                offerer: this.wallet.address,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(this.wallet.address)
            }]
        });
    }

    async requestQuote({ inputToken, inputAmount, outputToken, chainId = this.defaultChainId }: { inputToken: string, inputAmount: BigNumberish, outputToken: string, chainId?: number }) {
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
        await this.rawCall({
            method: AoriMethods.RequestQuote,
            params: [{
                apiKey: this.apiKey,
                inputToken,
                inputAmount,
                outputToken,
                chainId
            }]
        })
    }

    async getCounter({ address, chainId = this.defaultChainId }: { address: string, chainId?: number }) {
        await this.rawCall({
            method: AoriMethods.GetCounter,
            params: [{
                address,
                chainId
            }]
        })
    }

    async sendTransaction(tx: TransactionRequest): Promise<AoriMethodsEvents[AoriMethods.SendTransaction][0]> {
        if (tx.chainId == undefined) tx.chainId = this.defaultChainId;
        const signedTx = await this.wallet.signTransaction(tx);

        console.log(`🚚 Sending Transaction on chain ${tx.chainId} via ${this.apiUrl}`);
        console.log(`==================================================================`);
        console.log(`> Serialised Transaction: ${signedTx}`);
        console.log(`> Signer: ${this.wallet.address}`);
        console.log(`> To: ${tx.to}`);
        console.log(`> Value: ${tx.value}`);
        console.log(`> Data: ${tx.data}`);
        console.log(`> Gas Limit: ${tx.gasLimit}`);
        console.log(`> Gas Price: ${tx.gasPrice}`);
        console.log(`> Chain Id: ${tx.chainId || 1}`);
        console.log(`> Nonce: ${tx.nonce || 0}`);
        console.log(`==================================================================`);

        return await this.rawCall({
            method: AoriMethods.SendTransaction,
            params: [{
                signedTx,
                chainId: tx.chainId
            }]
        });
    }

    async rawCall<T>({ method, params }: { method: AoriMethods | string, params: [T] | [] }) {
        const id = this.counter;
        this.messages[id] = method;
        this.api.send(JSON.stringify({
            id,
            jsonrpc: "2.0",
            method,
            params
        }));
        this.counter++;
    }

    async subscribe() {
        await this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "aori_subscribeOrderbook",
            params: []
        }));
    }

    async marketOrder({
        order: { parameters, signature },
        chainId = this.defaultChainId,
        seatId = this.seatId
    }: {
        order: OrderWithCounter,
        chainId?: number,
        seatId?: number
    }) {
        console.log(`💹 Placing Market Order to ${this.takerUrl}`);
        console.log(this.formatOrder({ parameters, signature }, chainId));
        await axios.post(this.takerUrl, {
            id: 1,
            jsonrpc: "2.0",
            method: "aori_takeOrder",
            params: [{
                order: { parameters, signature },
                chainId,
                seatId
            }]
        });
    }

    async getNonce(chainId: number = this.defaultChainId): Promise<number> {
        const { data } = await axios.post(AORI_DATA_PROVIDER_API, {
            id: 1,
            jsonrpc: "2.0",
            method: "aori_getNonce",
            params: [{
                address: this.wallet.address,
                chainId,
                tag: "pending"
            }]
        });
        return data.result.nonce;
    }

    formatOrder(order: OrderWithCounter, chainId = this.defaultChainId) {
        const orderHash = getOrderHash(order.parameters, 0);

        return `==================================================================\n` +
            `> Hash: ${orderHash}\n` +
            `> [${formatEther(order.parameters.offer[0].startAmount)} ${order.parameters.offer[0].token} -> ` +
            `${formatEther(order.parameters.consideration[0].endAmount)} ${order.parameters.consideration[0].token}]\n` +
            `> Creator: ${order.parameters.offerer}\n` +
            `> Signature: ${order.signature}\n` +
            `> Chain Id: ${chainId}\n` +
            `> Zone: ${order.parameters.zone}\n` +
            `> Conduit Key: ${order.parameters.conduitKey}\n` +
            `> Start Time: ${new Date(Math.min(parseInt(order.parameters.startTime.toString()) * 1000, 8640000000000000)).toUTCString()}\n` +
            `> End Time: ${new Date(Math.min(parseInt(order.parameters.endTime.toString()) * 1000, 8640000000000000)).toUTCString()}\n` +
            `> Cancel Index: ${order.parameters.counter}\n` +
            `==================================================================`;
    }
}