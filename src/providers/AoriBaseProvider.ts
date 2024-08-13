import { BigNumberish, formatEther, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { AORI_TAKER_API, AoriMatchingDetails, AoriMethods, AoriMethodsEvents, AoriOrder, createLimitOrder, createMatchingOrder, getDefaultZone, getOrderHash, signOrderSync, TypedEventEmitter, ViewOrderbookQuery } from "../utils";
import { sendTransaction } from "./AoriDataProvider";
import { accountDetails, marketOrder, quote, requestQuote, requestSwap, viewOrderbook } from "./ProviderHelpers";

export interface AoriBaseParams {
    wallet: Wallet;
    defaultChainId?: number;

    apiUrl: string;
    takerUrl?: string;
    apiKey?: string;
    seatId?: number;
    vaultContract?: string;
}

export abstract class AoriBaseProvider extends TypedEventEmitter<Record<string, [{ method: AoriMethods | string, result: any }]>> {
    wallet: Wallet;
    defaultChainId: number;

    apiUrl: string;
    takerUrl: string;
    apiKey?: string;
    seatId: number = 0;
    cancelIndex: number = 0;
    vaultContract?: string;

    counter: number = 0;
    messages: { [counter: number]: AoriMethods | string } = {};

    constructor({
        wallet,
        defaultChainId = 1,
        apiKey,
        seatId = 0,
        vaultContract,
        apiUrl,
        takerUrl = AORI_TAKER_API
    }: AoriBaseParams) {
        super();

        this.wallet = wallet;
        this.defaultChainId = defaultChainId;
        this.apiKey = apiKey;
        this.seatId = seatId;
        this.vaultContract = vaultContract;
        this.apiUrl = apiUrl;
        this.takerUrl = takerUrl;
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    setDefaultChainId(chainId: number) {
        this.defaultChainId = chainId;
    }

    async connect() {
        return;
    }

    async terminate() {
        return;
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
        const limitOrder = await createLimitOrder({
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
            order: limitOrder,
            orderHash: getOrderHash(limitOrder)
        };
    }

    async createMatchingOrder(order: AoriOrder, feeInBips = 3n) {
        const matchingOrder = await createMatchingOrder(order, {
            offerer: (this.vaultContract != undefined) ? this.vaultContract : this.wallet.address,
            feeInBips
        });

        const signature = await signOrderSync(this.wallet, matchingOrder);
        return {
            signature,
            order: matchingOrder,
            orderHash: getOrderHash(matchingOrder)
        };
    }

    /*//////////////////////////////////////////////////////////////
                                ACTIONS
    //////////////////////////////////////////////////////////////*/

    async ping() {
        return await this.rawCall({
            method: AoriMethods.Ping,
            params: []
        });
    }

    async makeOrder({
        order,
        signature,
        isPrivate = false,
        apiKey
    }: {
        order: AoriOrder,
        signature?: string,
        isPrivate?: boolean,
        apiKey?: string,
    }): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]> {
        console.log(`💹 Placing Limit Order to ${this.apiUrl}`);
        console.log(this.formatOrder(order));
        return await this.rawCall({
            method: AoriMethods.MakeOrder,
            params: [{
                order,
                signature,
                signer: ZeroAddress,
                isPublic: !isPrivate,
                apiKey,
            }]
        });
    }

    async takeOrder({
        orderHash,
        order,
        signature,
        seatId = this.seatId,
        apiKey = this.apiKey,
        showExecutionDetails = false,
    }: {
        orderHash: string,
        order: AoriOrder,
        signature?: string,
        seatId?: number,
        apiKey?: string,
        showExecutionDetails?: boolean,
    }) {
        if (signature == undefined) signature = await signOrderSync(this.wallet, order);
        return await this.rawCall({
            method: AoriMethods.TakeOrder,
            params: [{
                orderHash,
                order,
                signature,
                seatId,
                apiKey,
                showExecutionDetails,
            }]
        });
    }

    async cancelOrder(params: {
        orderHash: string,
        siweMessage?: string,
        siweNonce?: string,
        signature: string,
    } | {
        orderHash: string,
        apiKey: string,
    }) {
        return await this.rawCall({
            method: AoriMethods.CancelOrder,
            params: [params]
        });
    }

    async cancelAllOrders(params: {
        apiKey: string
        tag?: string,
    } | {
        siweMessage?: string,
        siweNonce?: string,
        signature: string,
        tag?: string,
    }) {
        return await this.rawCall({
            method: AoriMethods.CancelAllOrders,
            params: [params]
        });
    }

    async failOrder({
        matching,
        matchingSignature,
        makerMatchingSignature,
    }: {
        matching: AoriMatchingDetails,
        matchingSignature: string,
        makerMatchingSignature?: string,
    }) {
        return await this.rawCall({
            method: AoriMethods.FailOrder,
            params: [{
                matching,
                matchingSignature,
                makerMatchingSignature,
            }]
        });
    }

    /*//////////////////////////////////////////////////////////////
                            NON-API ACTIONS
    //////////////////////////////////////////////////////////////*/

    async accountDetails(): Promise<AoriMethodsEvents[AoriMethods.AccountDetails][0]> {
        return await accountDetails(this.apiKey || "", this.apiUrl);
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
        return await viewOrderbook(query, this.apiUrl);
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
        return marketOrder({
            order,
            signature: signOrderSync(this.wallet, order),
            seatId,
        }, this.takerUrl);
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
    }): Promise<AoriMethodsEvents[AoriMethods.Quote][0]> {
        return await quote({
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey: this.apiKey,
            delay
        }, this.takerUrl);
    };

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
    }): Promise<void> {
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
        return await requestQuote({
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey: this.apiKey
        }, this.takerUrl);
    }

    async requestSwap({
        order,
        signature
    }: {
        order: AoriOrder,
        signature: string
    }) {
        console.log(`🗨️ Requesting Swap to trade ${formatEther(order.inputAmount)} ${order.inputToken} for ${formatEther(order.outputAmount)} ${order.outputToken} on chain ${order.inputChainId}`);
        return await requestSwap({
            order,
            signature,
            apiKey: this.apiKey
        }, this.takerUrl);
    }

    /*//////////////////////////////////////////////////////////////
                                HELPERS
    //////////////////////////////////////////////////////////////*/

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

    async rawCall<T>({
        method,
        params
    }: { method: AoriMethods | string, params: [T] | [] }, apiUrl: string = this.apiUrl): Promise<AoriMethodsEvents[keyof AoriMethodsEvents][0]> {}
}

