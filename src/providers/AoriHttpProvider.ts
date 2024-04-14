import axios from "axios";
import { BigNumberish, formatEther, JsonRpcError, JsonRpcResult, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { AORI_HTTP_API, AORI_TAKER_API, getOrderHash } from "../utils";
import { createLimitOrder, createMatchingOrder, getDefaultZone, signAddressSync, signOrderHashSync, signOrderSync } from "../utils/helpers";
import { AoriMethods, AoriMethodsEvents, AoriOrder, ViewOrderbookQuery } from "../utils/interfaces";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";
import { sendTransaction } from "./AoriDataProvider";
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

    async ping(): Promise<AoriMethodsEvents[AoriMethods.Ping][0]> {
        return await ping(this.apiUrl);
    }

    async accountDetails(): Promise<AoriMethodsEvents[AoriMethods.AccountDetails][0]> {
        return await accountDetails(this.apiKey, this.apiUrl);
    }

    async viewOrderbook(query?: ViewOrderbookQuery): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
        return await viewOrderbook(query, this.apiUrl);
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

        if (signature == undefined) signature = await signOrderSync(this.wallet, order);
        return makeOrder({
            order,
            signature,
            isPrivate,
            apiKey: this.apiKey,
        }, this.apiUrl);
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

        if (signature == undefined) signature = await signOrderSync(this.wallet, order);
        return await takeOrder({
            order,
            signature,
            orderHash,
            seatId,
            apiKey: this.apiKey
        }, this.apiUrl);
    }

    async cancelOrder(orderHash: string): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {
        console.log(`🗑️ Attempting to Cancel ${orderHash} on ${this.apiUrl}`);
        return await cancelOrder({
            orderHash,
            apiKey: this.apiKey,
            signature: signOrderHashSync(this.wallet, orderHash)
        }, this.apiUrl);
    }

    async cancelAllOrders(tag?: string): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]> {
        return await cancelAllOrders({
            apiKey: this.apiKey,
            signature: signAddressSync(this.wallet, this.vaultContract || this.wallet.address),
            ...(tag != undefined) ? { tag } : {}
        }, this.apiUrl);
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
    }): Promise<void> {
        console.log(`🗨️ Requesting Quote to trade ${formatEther(inputAmount)} ${inputToken} for ${outputToken} on chain ${chainId}`);
        return await requestQuote({
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey: this.apiKey
        }, this.apiUrl);
    }

    async quote({
        inputToken,
        inputAmount,
        outputToken,
        chainId = this.defaultChainId
    }: {
        inputToken: string,
        inputAmount: BigNumberish,
        outputToken: string,
        chainId?: number
    }): Promise<AoriMethodsEvents[AoriMethods.Quote][0]> {
        return await quote({
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey: this.apiKey
        }, this.apiUrl);
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

/*//////////////////////////////////////////////////////////////
                        STANDALONE FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function rawCall<T>({
    method,
    params
}: {
    method: AoriMethods | string,
    params: [T] | []
}, apiUrl: string = AORI_HTTP_API) {
    const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(apiUrl, {
        id: 1,
        jsonrpc: "2.0",
        method,
        params
    });
    if ("error" in axiosResponseData) {
        throw new Error(axiosResponseData.error.message);
    }

    const { result: data } = axiosResponseData;
    return data;
}

export async function ping(apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.Ping][0]> {
    return await rawCall({
        method: AoriMethods.Ping,
        params: []
    }, apiUrl);
}

export async function accountDetails(apiKey: string, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.AccountDetails][0]> {
    return await rawCall({
        method: AoriMethods.AccountDetails,
        params: [{
            apiKey
        }]
    }, apiUrl)
}

export async function makeOrder({
    order,
    signature,
    isPrivate = false,
    apiKey
}: {
    order: AoriOrder,
    signature: string,
    isPrivate?: boolean,
    apiKey?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]> {
    return await rawCall({
        method: AoriMethods.MakeOrder,
        params: [{
            order,
            signature,
            signer: ZeroAddress,
            isPublic: !isPrivate,
            apiKey,
        }]
    }, apiUrl);
}

export async function takeOrder({
    orderHash,
    order,
    signature,
    seatId = 0,
    apiKey
}: {
    orderHash: string,
    order: AoriOrder,
    signature: string,
    seatId?: number,
    apiKey?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.TakeOrder][0]> {
    return await rawCall({
        method: AoriMethods.TakeOrder,
        params: [{
            order,
            signature,
            orderHash,
            seatId,
            apiKey
        }]
    }, apiUrl);
}

export async function marketOrder({
    order,
    signature,
    seatId = 0
}: {
    order: AoriOrder,
    signature: string,
    seatId?: number
}, takerUrl: string = AORI_TAKER_API) {
    return await rawCall({
        method: "aori_takeOrder",
        params: [{
            order,
            signature,
            seatId
        }]
    }, takerUrl);
}

export async function cancelOrder({
    orderHash,
    signature,
    apiKey,
    privyAuth
}: {
    orderHash: string,
    signature: string,
    apiKey?: string,
    privyAuth?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]> {
    return await rawCall({
        method: AoriMethods.CancelOrder,
        params: [{
            orderHash: orderHash,
            signature,
            apiKey,
            privyAuth
        }]
    }, apiUrl);
}

export async function cancelAllOrders({
    signature,
    tag,
    apiKey,
    privyAuth
}: {
    apiKey?: string,
    signature: string,
    tag?: string,
    privyAuth?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]> {
    return await rawCall({
        method: AoriMethods.CancelAllOrders,
        params: [{
            signature,
            ...(tag != undefined) ? { tag } : {},
            apiKey,
            privyAuth
        }]
    }, apiUrl);
}

export async function viewOrderbook(query?: ViewOrderbookQuery, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]> {
    const { orders } = await rawCall({
        method: AoriMethods.ViewOrderbook,
        params: query != undefined ? [query] : []
    }, apiUrl);
    return orders;
}

export async function requestQuote({
    inputToken,
    inputAmount,
    outputToken,
    chainId,
    apiKey
}: {
    inputToken: string,
    inputAmount: BigNumberish,
    outputToken: string,
    chainId: number,
    apiKey?: string
}, apiUrl: string = AORI_HTTP_API): Promise<void> {
    return await rawCall({
        method: AoriMethods.RequestQuote,
        params: [{
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey
        }]
    }, apiUrl);
}

export async function quote({
    inputToken,
    inputAmount,
    outputToken,
    chainId,
    apiKey
}: {
    inputToken: string,
    inputAmount: BigNumberish,
    outputToken: string,
    chainId: number,
    apiKey?: string
}, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[AoriMethods.Quote][0]> {
    const { orders } = await rawCall({
        method: AoriMethods.Quote,
        params: [{
            inputToken,
            inputAmount: inputAmount.toString(),
            outputToken,
            chainId,
            apiKey
        }]
    }, apiUrl);

    return orders;
};

/*//////////////////////////////////////////////////////////////
                        COMBINED FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function createAndMakeOrder(makerWallet: Wallet, orderParams: Parameters<typeof createLimitOrder>[0], apiUrl: string = AORI_HTTP_API) {
    const limitOrder = await createLimitOrder(orderParams);
    return await makeOrder({
        order: limitOrder,
        signature: await signOrderSync(makerWallet, limitOrder)
    }, apiUrl);
}

export async function matchAndTakeOrder(takerWallet: Wallet, makerOrder: AoriOrder, apiUrl: string = AORI_HTTP_API) {
    const takerOrder = await createMatchingOrder(makerOrder, { offerer: takerWallet.address || "" });
    return await takeOrder({
        orderHash: getOrderHash(makerOrder),
        order: takerOrder,
        signature: signOrderSync(takerWallet, takerOrder)
    }, apiUrl);
}
