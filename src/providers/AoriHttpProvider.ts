import axios from "axios";
import { BigNumberish, formatEther, JsonRpcError, JsonRpcResult, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { AORI_HTTP_API, AORI_TAKER_API, getOrderHash } from "../utils";
import { formatIntoLimitOrder, getDefaultZone, signOrderSync } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { getNonce, sendTransaction } from "./AoriDataProvider";
export class AoriHttpProvider extends TypedEventEmitter<AoriMethodsEvents> {

    apiUrl: string;
    takerUrl: string;

    wallet: Wallet;
    apiKey: string = "";
    vaultContract?: string;
    counter: number = 0;
    cancelIndex: number = 0;
    seatId: number = 0;

    messages: { [counter: number]: AoriMethods | string }
    defaultChainId: number;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        apiUrl = AORI_HTTP_API,
        takerUrl = AORI_TAKER_API,
        vaultContract,
        apiKey,
        defaultChainId = 5,
        seatId = 0,
    }: {
        wallet: Wallet,
        apiKey: string,
        apiUrl?: string,
        takerUrl?: string,
        vaultContract?: string,
        defaultChainId?: number
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

        console.log("🤖 Creating an Aori Provider Instance");
        console.log("==================================================================");
        console.log(`> Executor Wallet: ${wallet.address}`);
        if (vaultContract) console.log(`> Vault Contract: ${vaultContract}`);
        console.log(`> API URL: ${apiUrl}`);
        console.log(`> Seat Id: ${seatId} (read more about seats at seats.aori.io)`);
        console.log(`> Default Chain ID: ${defaultChainId}`);
        console.log("==================================================================");

        console.log(`🔌 Connected via HTTP to ${apiUrl}...`);
    }

    static default({ wallet, apiKey }: { wallet: Wallet, apiKey: string }): AoriHttpProvider {
        return new AoriHttpProvider({ wallet, apiKey })
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async initialise(...any: any[]): Promise<void> { }

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
        outputZone = getDefaultZone(outputChainId),
    }: {
        offerer?: string;
        zone?: string;
        startTime?: number;
        endTime?: number;
        inputToken: string;
        inputAmount: bigint | string;
        inputChainId?: number;
        inputZone?: string;
        outputToken: string;
        outputAmount: bigint | string;
        outputChainId?: number;
        outputZone?: string;
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
            order: limitOrder,
            orderHash: getOrderHash(limitOrder)
        };
    }

    async createMatchingOrder({ inputToken, inputAmount, inputChainId, inputZone, outputToken, outputAmount, outputChainId, outputZone }: AoriOrder, feeInBips = 3n) {
        const matchingOrder = await formatIntoLimitOrder({
            offerer: (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
            inputToken: outputToken,
            inputAmount: BigInt(outputAmount) * (10000n + feeInBips) / 10000n,
            inputChainId: outputChainId,
            inputZone: outputZone,
            outputToken: inputToken,
            outputAmount: BigInt(inputAmount),
            outputChainId: inputChainId,
            outputZone: inputZone,
            counter: this.cancelIndex
        });
        const signature = await this.signOrder(matchingOrder);
        return {
            signature,
            order: matchingOrder,
            orderHash: getOrderHash(matchingOrder)
        };
    }

    async signOrder(order: AoriOrder) {
        return await signOrderSync(this.wallet, order);
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

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
        const { orders } = await this.rawCall({
            method: AoriMethods.ViewOrderbook,
            params: query != undefined ? [query] : []
        });
        return orders;
    }

    async makeOrder({
        order,
        signature,
        isPrivate = false
    }: {
        order: AoriOrder,
        signature?: string,
        isPrivate?: boolean
    }): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]> {
        console.log(`💹 Placing Limit Order to ${this.apiUrl}`);
        console.log(this.formatOrder(order));

        if (signature == undefined) signature = await this.signOrder(order);
        return await this.rawCall({
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

    async takeOrder({
        orderHash,
        order,
        signature,
        seatId = this.seatId
    }: {
        orderHash: string,
        order: AoriOrder,
        signature?: string,
        seatId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.TakeOrder][0]> {
        console.log(`💹 Attempting to Take ${orderHash} on ${this.apiUrl}`);
        console.log(this.formatOrder(order));

        if (signature == undefined) signature = await this.signOrder(order);
        return await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                order,
                signature,
                orderHash,
                seatId,
                apiKey: this.apiKey
            }]
        })
    }

    async cancelOrder(orderHash: string): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {
        console.log(`🗑️ Attempting to Cancel ${orderHash} on ${this.apiUrl}`);
        return await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderHash: orderHash,
                apiKey: this.apiKey
            }]
        });
    }

    async cancelAllOrders(tag?: string): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]> {
        return await this.rawCall({
            method: AoriMethods.CancelAllOrders,
            params: [{
                apiKey: this.apiKey,
                ...(tag != undefined) ? { tag } : {}
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
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
        return await this.rawCall({
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

    async marketOrder({
        order,
        seatId = this.seatId
    }: {
        order: AoriOrder,
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
                signature: this.signOrder(order),
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