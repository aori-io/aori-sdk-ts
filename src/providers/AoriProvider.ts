import axios from "axios";
import { BigNumberish, formatEther, getBytes, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { AORI_API, AORI_TAKER_API, connectTo, defaultDuration, getOrderHash } from "../utils";
import { formatIntoLimitOrder, getDefaultZone, signOrderSync } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { getNonce, sendTransaction } from "./AoriDataProvider";
export class AoriProvider extends TypedEventEmitter<AoriMethodsEvents> {

    apiUrl: string;
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
        takerUrl = AORI_TAKER_API,
        vaultContract,
        apiKey,
        keepAlive = true,
        defaultChainId = 5,
        seatId = 0
    }: {
        wallet: Wallet,
        apiUrl?: string,
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

        this.api = connectTo(this.apiUrl);

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
        inputZone = getDefaultZone(inputChainId),
        outputToken,
        outputAmount,
        outputChainId = this.defaultChainId,
        outputZone = getDefaultZone(outputChainId)
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
        return await signOrderSync(this.wallet, order);
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

    async sendTransaction(tx: TransactionRequest): Promise<string> {
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

        return await sendTransaction(signedTx);
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
        return await getNonce(chainId, this.wallet.address);
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