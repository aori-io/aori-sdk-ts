import { ItemType } from "@opensea/seaport-js/lib/constants";
import axios from "axios";
import { BigNumberish, getBytes, JsonRpcError, JsonRpcResult, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { AORI_FEED, AORI_HTTP_API, AORI_TAKER_API, AORI_ZONE_ADDRESS, connectTo, getOrderHash } from "../utils";
import { formatIntoLimitOrder, OrderWithCounter, signOrder } from "../utils/helpers";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { ViewOrderbookQuery } from "./interfaces";
import { AoriMethods, AoriMethodsEvents, SubscriptionEvents } from "./utils";
export class AoriHttpProvider extends TypedEventEmitter<AoriMethodsEvents> {

    apiUrl: string;
    feedUrl: string;
    takerUrl: string;

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

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        apiUrl = AORI_HTTP_API,
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
        defaultChainId?: number
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

        console.log(`🔌 Connected via HTTP to ${apiUrl}...`);
        this.connect();
    }

    static default({ wallet }: { wallet: Wallet }): AoriHttpProvider {
        return new AoriHttpProvider({ wallet })
    }

    async connect() {
        if (this.feed) this.feed.close();
        this.feed = connectTo(this.feedUrl);

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.feedUrl}`);
            if (this.keepAlive) {
                this.keepAliveTimer = setInterval(() => {
                    this.feed.ping();
                }, 10_000);
            }
            this.emit("ready");
            console.log(`🫡 Provider ready to send requests`);
        });

        this.feed.on("message", (msg) => {
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
                case SubscriptionEvents.OrderToExecute:
                    this.emit(SubscriptionEvents.OrderToExecute, data);
                    break;
                case SubscriptionEvents.QuoteRequested:
                    this.emit(SubscriptionEvents.QuoteRequested, data);
                    break;
            }
        });

        this.feed.on(AoriMethods.Ping, () => {
            console.log(`🏓 Sent ping, got pong from ${this.feedUrl}`);
        });

        this.feed.on("close", () => {
            console.log(`Got disconnected...`);
            setTimeout(() => {
                console.log(`Reconnecting...`);
                this.connect();
            }, 5_000);
        });
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async initialise(...any: any[]): Promise<void> { }

    terminate() {
        if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); }
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
        limitOrder.signature = await this.signOrder(limitOrder, chainId);
        return {
            ...limitOrder,
            orderHash: getOrderHash(limitOrder.parameters, this.cancelIndex)
        };
    }

    async createMatchingOrder({
        order,
        chainId = this.defaultChainId,
    }: {
        order: OrderWithCounter,
        chainId: number
    }, feeInBips = 3n) {
        const matchingOrder = await formatIntoLimitOrder({
            offerer: (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
            zone: order.parameters.zone,
            inputToken: order.parameters.consideration[0].token,
            inputAmount: BigInt(order.parameters.consideration[0].startAmount) * (10000n + feeInBips) / 10000n,
            outputToken: order.parameters.offer[0].token,
            outputAmount: BigInt(order.parameters.offer[0].startAmount),
            counter: `${this.cancelIndex}`
        });

        matchingOrder.signature = await this.signOrder(matchingOrder, chainId);
        return {
            ...matchingOrder,
            orderHash: getOrderHash(matchingOrder.parameters, this.cancelIndex)
        };
    }

    async signOrder(order: OrderWithCounter, chainId: string | number = this.defaultChainId) {
        return await signOrder(this.wallet, order, chainId);
    }

    /*//////////////////////////////////////////////////////////////
                                ACTIONS
    //////////////////////////////////////////////////////////////*/

    async ping(): Promise<AoriMethodsEvents[AoriMethods.Ping][0]> {
        return await this.rawCall({
            method: AoriMethods.Ping,
            params: []
        });
    }

    async authWallet(): Promise<AoriMethodsEvents[AoriMethods.AuthWallet][0]> {
        const { address } = this.wallet;

        return await this.rawCall({
            method: AoriMethods.AuthWallet,
            params: [{
                address,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(address)
            }]
        })
    }

    async checkAuth({ auth }: { auth: string }): Promise<AoriMethodsEvents[AoriMethods.CheckAuth][0]> {
        return await this.rawCall({
            method: AoriMethods.CheckAuth,
            params: [{
                auth
            }]
        })
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
        const { orders } = await this.rawCall({
            method: AoriMethods.ViewOrderbook,
            params: query != undefined ? [query] : []
        });
        return orders;
    }

    async accountOrders(): Promise<AoriMethodsEvents[AoriMethods.AccountOrders][0]> {
        const offerer = this.wallet.address;
        return await this.rawCall({
            method: AoriMethods.AccountOrders,
            params: [{
                offerer,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(offerer)
            }]
        });
    }

    async accountBalance(token: string, chainId: number = this.defaultChainId): Promise<AoriMethodsEvents[AoriMethods.AccountBalance][0]> {
        const { address } = this.wallet;
        return await this.rawCall({
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

    async accountCredit(): Promise<AoriMethodsEvents[AoriMethods.AccountCredit][0]> {
        const { address } = this.wallet;
        return await this.rawCall({
            method: AoriMethods.AccountCredit,
            params: [{
                address,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(address)
            }]
        })
    }

    async orderStatus(orderHash: string): Promise<AoriMethodsEvents[AoriMethods.OrderStatus][0]> {
        return await this.rawCall({
            method: AoriMethods.OrderStatus,
            params: [{
                orderHash
            }]
        });
    }

    async makeOrder({
        order,
        chainId = this.defaultChainId,
        isPrivate = false
    }: {
        order: OrderWithCounter,
        chainId?: number,
        isPrivate?: boolean
    }): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]> {
        return await this.rawCall({
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

    async takeOrder({
        orderId,
        order,
        chainId = this.defaultChainId,
        seatId = this.seatId
    }: {
        orderId: string,
        order: OrderWithCounter,
        chainId?: number,
        seatId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.TakeOrder][0]> {
        return await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order,
                chainId,
                orderId,
                seatId
            }]
        })
    }

    async cancelOrder(orderHash: string): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {
        return await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderId: orderHash,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(orderHash)) : this.wallet.signMessageSync(orderHash)
            }]
        });
    }

    async cancelAllOrders(): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]> {
        return await this.rawCall({
            method: AoriMethods.CancelAllOrders,
            params: [{
                offerer: this.wallet.address,
                signature: this.vaultContract != undefined ?
                    this.wallet.signMessageSync(getBytes(this.vaultContract)) : this.wallet.signMessageSync(this.wallet.address)
            }]
        });
    }

    async requestQuote({
        inputToken,
        inputAmount,
        outputToken,
        chainId = this.defaultChainId
    }: {
        inputToken: string,
        inputAmount: BigNumberish,
        outputToken: string,
        chainId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.RequestQuote][0]> {
        return await this.rawCall({
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

    async getCounter({
        address,
        chainId = this.defaultChainId
    }: {
        address: string,
        chainId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.GetCounter][0]> {
        return await this.rawCall({
            method: AoriMethods.GetCounter,
            params: [{
                address,
                chainId
            }]
        })
    }

    async sendTransaction({
        to,
        value,
        data,
        gasLimit = 800_000,
        chainId = this.defaultChainId
    }: {
        to: string,
        value: BigNumberish,
        data: string,
        gasLimit?: number,
        chainId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.SendTransaction][0]> {
        const signedTx = await this.wallet.signTransaction({ to, value, data, gasLimit });

        return await this.rawCall({
            method: AoriMethods.SendTransaction,
            params: [{
                signedTx, chainId
            }]
        });
    }

    async rawCall<T>({
        method,
        params
    }: {
        method: AoriMethods | string,
        params: [T] | []
    }) {
        const id = this.counter;
        this.messages[id] = method;
        const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(this.apiUrl, {
            id,
            jsonrpc: "2.0",
            method,
            params
        });
        if ("error" in axiosResponseData) {
            throw new Error(axiosResponseData.error.message);
        }

        const { result: data } = axiosResponseData;

        this.counter++;
        return data;
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
        order: OrderWithCounter,
        chainId?: number,
        seatId?: number
    }) {
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
}