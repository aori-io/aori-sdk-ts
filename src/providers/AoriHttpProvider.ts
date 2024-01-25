import axios from "axios";
import { BigNumberish, formatEther, getBytes, JsonRpcError, JsonRpcResult, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { AORI_DATA_PROVIDER_API, AORI_HTTP_API, AORI_TAKER_API, defaultDuration, getOrderHash } from "../utils";
import { formatIntoLimitOrder, getDefaultZone, signOrderSync } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
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
        apiUrl?: string,
        takerUrl?: string,
        vaultContract?: string,
        apiKey?: string,
        defaultChainId?: number
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

    static default({ wallet }: { wallet: Wallet }): AoriHttpProvider {
        return new AoriHttpProvider({ wallet })
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
        startTime = Math.floor(Date.now() / 1000),
        endTime = startTime + defaultDuration,
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
            inputAmount: BigInt(inputAmount) * (10000n + feeInBips) / 10000n,
            inputChainId: outputChainId,
            inputZone: outputZone,
            outputToken: inputToken,
            outputAmount: BigInt(outputAmount),
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
                apiKey: this.apiKey,
                signer: ZeroAddress,
                isPublic: !isPrivate,
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
                seatId
            }]
        })
    }

    async cancelOrder(orderHash: string): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {
        console.log(`🗑️ Attempting to Cancel ${orderHash} on ${this.apiUrl}`);
        return await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [{
                orderHash: orderHash,
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
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
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
                signedTx
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