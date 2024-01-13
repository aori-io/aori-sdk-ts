import axios from "axios";
import { BigNumberish, formatEther, getBytes, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { AORI_API, AORI_DATA_PROVIDER_API, AORI_FEED, AORI_TAKER_API, AORI_ZONE_ADDRESS, connectTo, defaultDuration, getOrderHash } from "../utils";
import { formatIntoLimitOrder } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, SubscriptionEvents, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
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
        startTime = Math.floor(Date.now() / 1000),
        endTime = startTime + defaultDuration,
        inputToken,
        inputAmount,
        inputChainId = this.defaultChainId,
        inputZone = AORI_ZONE_ADDRESS,
        outputToken,
        outputAmount,
        outputChainId = this.defaultChainId,
        outputZone = AORI_ZONE_ADDRESS
    }: {
        offerer?: string;
        startTime?: number;
        endTime?: number;
        inputToken: string;
        inputAmount: bigint | string;
        inputChainId: number;
        inputZone?: string;
        outputToken: string;
        outputAmount: bigint | string;
        outputChainId: number;
        outputZone?: string;
        chainId?: string | number;
    }) {
        const limitOrder = await formatIntoLimitOrder({
            offerer,
            startTime,
            endTime,
            inputToken,
            inputAmount: BigInt(inputAmount),
            inputChainId,
            inputZone,
            outputToken,
            outputAmount: BigInt(outputAmount),
            outputChainId,
            outputZone,
            counter: this.cancelIndex
        });
        const signature = await this.signOrder(limitOrder);
        return {
            signature,
            orderHash: getOrderHash(limitOrder)
        };
    }

    async createMatchingOrder({
        order: {
            inputToken,
            inputAmount,
            inputChainId,
            inputZone,
            outputToken,
            outputAmount,
            outputChainId,
            outputZone
        }
    }: {
        order: AoriOrder,
        chainId: number
    }, feeInBips = 3n) {
        const matchingOrder = await formatIntoLimitOrder({
            offerer: (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
            inputToken,
            inputAmount: BigInt(outputAmount) * (10000n + feeInBips) / 10000n,
            inputChainId,
            inputZone,
            outputToken,
            outputAmount: BigInt(inputAmount),
            outputChainId,
            outputZone,
            counter: this.cancelIndex
        });

        const signature = await this.signOrder(matchingOrder);
        return {
            signature,
            order: matchingOrder,
        };
    }

    async signOrder(order: AoriOrder) {
        const orderHash = getOrderHash(order);
        return this.wallet.signMessageSync(orderHash);
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

    async makeOrder({ order, chainId = this.defaultChainId, isPrivate = false }: { order: AoriOrder, chainId?: number, isPrivate?: boolean }) {
        console.log(`💹 Placing Limit Order to ${this.apiUrl}`);
        console.log(this.formatOrder(order));
        await this.rawCall({
            method: AoriMethods.MakeOrder,
            params: [{
                order,
                apiKey: this.apiKey,
                signer: ZeroAddress,
                isPublic: !isPrivate,
                chainId,
            }]
        });
    }

    async takeOrder({ orderHash, order, chainId = this.defaultChainId, seatId = this.seatId }: { orderHash: string, order: AoriOrder, chainId?: number, seatId?: number }) {
        console.log(`💹 Attempting to Take ${orderHash} on ${this.apiUrl}`);
        console.log(this.formatOrder(order));
        await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order,
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
        order,
        chainId = this.defaultChainId,
        seatId = this.seatId
    }: {
        order: AoriOrder,
        chainId?: number,
        seatId?: number
    }) {
        console.log(`💹 Placing Market Order to ${this.takerUrl}`);
        console.log(this.formatOrder(order));
        await axios.post(this.takerUrl, {
            id: 1,
            jsonrpc: "2.0",
            method: "aori_takeOrder",
            params: [{
                order,
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

    formatOrder(order: AoriOrder) {
        const orderHash = getOrderHash(order);

        return `==================================================================\n` +
            `> Hash: ${orderHash}\n` +
            `> [${formatEther(order.inputAmount)} ${order.inputToken} -> ` +
            `${formatEther(order.outputAmount)} ${order.outputToken}]\n` +
            `> Creator: ${order.offerer}\n` +
            `> Zone: ${order.inputZone}\n` +
            `> Start Time: ${new Date(Math.min(parseInt(order.startTime.toString()) * 1000, 8640000000000000)).toUTCString()}\n` +
            `> End Time: ${new Date(Math.min(parseInt(order.endTime.toString()) * 1000, 8640000000000000)).toUTCString()}\n` +
            `> Cancel Index: ${order.counter}\n` +
            `==================================================================`;
    }
}