import axios from "axios";
import { BigNumberish, formatEther, TransactionRequest, Wallet, ZeroAddress } from "ethers";
import { EventEmitter, WebSocket } from "ws";
import { AORI_API, AORI_TAKER_API, getOrderHash } from "../utils";
import { formatIntoLimitOrder, getDefaultZone, signAddressSync, signOrderHashSync, signOrderSync } from "../utils/helpers";
import { AoriMatchingDetails, AoriMethods, AoriMethodsEvents, AoriOrder, TypedEventEmitter, ViewOrderbookQuery } from "../utils/interfaces";
import { sendTransaction } from "./AoriDataProvider";
import { AoriBaseParams, AoriBaseProvider } from "./AoriBaseProvider";
import { IAoriProvider } from "./IAoriProvider";
export class AoriProvider extends AoriBaseProvider implements IAoriProvider {

    ws: WebSocket = null as any;

    keepAliveTimer: NodeJS.Timeout;
    readyLatch: boolean = false;

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        apiUrl = AORI_API,
        vaultContract,
        apiKey,
        defaultChainId = 5,
        seatId = 0
    }: AoriBaseParams) {
        super({ wallet, defaultChainId, apiKey, seatId, vaultContract, apiUrl });

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
        return new AoriProvider({ wallet, apiKey, apiUrl: AORI_API });
    }

    async connect() {
        if (this.ws) this.ws.close();

        this.ws = new WebSocket(this.apiUrl);

        this.readyLatch = false;

        this.ws.on("message", (msg) => {
            const { id, result, error } = JSON.parse(msg.toString());

            if (error) {
                console.log(error);
                this.emit("error", error);
                return;
            }

            switch (this.messages[id] || null) {
                case AoriMethods.Ping:
                    console.log(`Received ${result} back`);
                    this.emit(String(id), { method: AoriMethods.Ping, result: "aori_pong" });
                    break;
                case AoriMethods.SupportedChains:
                    this.emit(String(id), { method: AoriMethods.SupportedChains, result });
                    break;
                case AoriMethods.ViewOrderbook:
                    this.emit(String(id), { method: AoriMethods.ViewOrderbook, result: result.orders });
                    break;
                case AoriMethods.MakeOrder:
                    this.emit(String(id), { method: AoriMethods.MakeOrder, result: result.orderHash });
                    break;
                case AoriMethods.CancelOrder:
                    this.emit(String(id), { method: AoriMethods.CancelOrder, result: result.orderHash });
                    break;
                case AoriMethods.TakeOrder:
                    this.emit(String(id), { method: AoriMethods.TakeOrder, result: result.orderHash });
                    break;
                case AoriMethods.AccountDetails:
                    this.emit(String(id), { method: AoriMethods.AccountDetails, result });
                case AoriMethods.CancelAllOrders:
                    this.emit(String(id), { method: AoriMethods.CancelAllOrders, result: "Ok" });
                case AoriMethods.Quote:
                    this.emit(String(id), { method: AoriMethods.Quote, result: result.orders });
                    break;
                default:
                    this.emit(String(id), { method: this.messages[id], result });
                    break;
            }
        });

        this.ws.on("close", () => {
            console.log(`Got disconnected...`);
            setTimeout(() => {
                console.log(`Reconnecting...`);
                this.connect();
            }, 5_000);
            this.readyLatch = false;
        });

        // return when the connection is ready

        this.ws.on("open", () => {
            console.log(`⚡ Connected to ${this.apiUrl}`);

            this.keepAliveTimer = setInterval(() => {
                this.ws.ping();
            }, 10_000);
            
            if (!this.readyLatch) {
                this.readyLatch = true;
            } else {
                this.emit("ready", { method: "ready", result: "Ready" });
            }
        });
    }

    /*//////////////////////////////////////////////////////////////
                                METHODS
    //////////////////////////////////////////////////////////////*/

    async terminate() {
        if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); }
        this.ws.close();
    }

    async rawCall<T>({ method, params }: { method: AoriMethods | string, params: [T] | [] }) {
        const id = this.counter;
        this.messages[id] = method;
        this.counter++;

        return new Promise((resolve, reject) => {

            const deadline = setTimeout(() => {
                reject(new Error("Request timed out"));
            }, 15_000);

            this.ws.on(String(id), ([{ method, result }]) => {
                if (method != this.messages[method]) return;
                resolve(result);
                clearTimeout(deadline);
            });

            this.ws.send(JSON.stringify({
                id,
                jsonrpc: "2.0",
                method,
                params
            }));

            this.ws.on("error", (err) => {
                reject(err);
                clearTimeout(deadline);
            });
        });
    }
}