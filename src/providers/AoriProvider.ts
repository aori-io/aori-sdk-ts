import axios from "axios";
import { BigNumberish, formatEther, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { WebSocket } from "ws";
import { AORI_API, AORI_TAKER_API, connectTo, getOrderHash } from "../utils";
import { formatIntoLimitOrder, getDefaultZone, signAddressSync, signOrderHashSync, signOrderSync } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { sendTransaction } from "./AoriDataProvider";
export class AoriProvider extends TypedEventEmitter<AoriMethodsEvents> {

    apiUrl: string;
    takerUrl: string;

    api: WebSocket = null as any;

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
        apiKey: string,
        apiUrl?: string,
        takerUrl?: string,
        vaultContract?: string,
        keepAlive?: boolean,
        defaultChainId?: number,
        seatId?: number
    }) {
        super();

        this.wallet = wallet;
        this.apiKey = apiKey;
        this.apiUrl = apiUrl;
        this.takerUrl = takerUrl;
        this.seatId = seatId;
        this.defaultChainId = defaultChainId;

        this.messages = {};
        if (vaultContract) this.vaultContract = vaultContract;

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

    static default({ wallet, apiKey }: { wallet: Wallet, apiKey: string }): AoriProvider {
        return new AoriProvider({ wallet, apiKey });
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
                case AoriMethods.SupportedChains:
                    this.emit(AoriMethods.SupportedChains, result);
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
                case AoriMethods.AccountDetails:
                    this.emit(AoriMethods.AccountDetails, result);
                case AoriMethods.CancelAllOrders:
                    this.emit(AoriMethods.CancelAllOrders);
                case AoriMethods.Quote:
                    this.emit(AoriMethods.Quote, result.orders);
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
    }

    setDefaultChainId(chainId: number) {
        this.defaultChainId = chainId;
    }

    async createLimitOrder({
        offerer = (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
        startTime,
        endTime,
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
        const signature = await signOrderSync(this.wallet, limitOrder);
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

        const signature = await signOrderSync(this.wallet, matchingOrder);
        return {
            signature,
            order: matchingOrder,
        };
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

    async accountDetails(): Promise<void> {
        await this.rawCall({
            method: AoriMethods.AccountDetails,
            params: [{
                apiKey: this.apiKey
            }]
        });
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<void> {
        await this.rawCall({
            method: AoriMethods.ViewOrderbook,
            params: query != undefined ? [query] : []
        });
    }

    async makeOrder({
        order,
        signature,
        isPrivate = false
    }: { order: AoriOrder, signature?: string, isPrivate?: boolean }) {
        console.log(`💹 Placing Limit Order to ${this.apiUrl}`);
        console.log(this.formatOrder(order));
        await this.rawCall({
            method: AoriMethods.MakeOrder,
            params: [{
                order,
                signature,
                signer: ZeroAddress,
                isPublic: !isPrivate,
                apiKey: this.apiKey,
            }]
        });
    }

    async takeOrder({ orderHash, order, signature, seatId = this.seatId }: { orderHash: string, order: AoriOrder, signature?: string, seatId?: number }) {
        console.log(`💹 Attempting to Take ${orderHash} on ${this.apiUrl}`);
        console.log(this.formatOrder(order));

        if (signature == undefined) signature = await signOrderSync(this.wallet, order);
        await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order,
                signature,
                orderId: orderHash,
                seatId,
                apiKey: this.apiKey,
            }]
        })
    }

    async cancelOrder(orderHash: string) {
        await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderHash: orderHash,
                apiKey: this.apiKey,
                signature: signOrderHashSync(this.wallet, orderHash)
            }]
        });
    }

    async cancelAllOrders(tag?: string) {
        await this.rawCall({
            method: AoriMethods.CancelAllOrders,
            params: [{
                apiKey: this.apiKey,
                signature: signAddressSync(this.wallet, this.vaultContract || this.wallet.address),
                ...(tag != undefined) ? { tag } : {}
            }]
        });
    }

    async requestQuote({ inputToken, inputAmount, outputToken, chainId = this.defaultChainId }: { inputToken: string, inputAmount: BigNumberish, outputToken: string, chainId?: number }) {
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
        await this.rawCall({
            method: AoriMethods.RequestQuote,
            params: [{
                inputToken,
                inputAmount: inputAmount.toString(),
                outputToken,
                chainId,
                apiKey: this.apiKey,
            }]
        })
    }


    async quote({
        inputToken,
        inputAmount,
        outputToken,
        chainId = this.defaultChainId,
        delay
    }: {
        inputToken: string,
        inputAmount: BigNumberish,
        outputToken: string,
        chainId?: number,
        delay?: number
    }) {
        await this.rawCall({
            method: AoriMethods.Quote,
            params: [{
                inputToken,
                inputAmount: inputAmount.toString(),
                outputToken,
                chainId,
                apiKey: this.apiKey,
                delay
            }]
        })
    };

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