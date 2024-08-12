import axios from "axios";
import { BigNumberish, formatEther, JsonRpcError, JsonRpcResult, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { AORI_HTTP_API, AORI_ORDERBOOK_API, AORI_TAKER_API, getOrderHash } from "../utils";
import { calldataToSettleOrders, createLimitOrder, createMatchingOrder, encodeInstructions, getDefaultZone, sendOrRetryTransaction, signAddressSync, signMatchingSync, signOrderHashSync, signOrderSync } from "../utils/helpers";
import { AoriMatchingDetails, AoriMethods, AoriMethodsEvents, AoriOrder, DetailsToExecute, OrderView, ViewOrderbookQuery } from "../utils/interfaces";
import { IAoriProvider } from "./IAoriProvider";
import { AoriBaseParams, AoriBaseProvider } from "./AoriBaseProvider";
export class AoriHttpProvider extends AoriBaseProvider implements IAoriProvider {

    takerUrl: string;

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
    }: AoriBaseParams) {
        super({ wallet, defaultChainId, apiKey, seatId, vaultContract, apiUrl });
        this.takerUrl = takerUrl;

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
        return new AoriHttpProvider({ wallet, apiKey, apiUrl: AORI_HTTP_API })
    }

    async rawCall<T>({ method, params }: { method: AoriMethods | string; params: [T] | []; }, apiUrl: string = AORI_HTTP_API): Promise<AoriMethodsEvents[keyof AoriMethodsEvents][0]> { 
        const id = this.counter;
        this.messages[id] = method;

        const { data } = await axios.post(apiUrl, {
            id,
            jsonrpc: "2.0",
            method,
            params
        });

        this.counter++;
        return data.result;
    }
}
