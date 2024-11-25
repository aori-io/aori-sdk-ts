import { WebSocket } from "ws";
import axios from "axios";
import { AORI_HTTP_API, AORI_WS_API, SignedOrder, TypedEventEmitter } from "../utils";
import { IntentSubscriptionEvent, IntentSubscriptionEventData, IntentWebsocketEventData } from "../utils/intent";

export class IntentProvider extends TypedEventEmitter<IntentWebsocketEventData> {
    
    wsUrl: string;
    feed: WebSocket;
    keepAliveTimer: NodeJS.Timeout;

    constructor(wsUrl: string, params?: { zone?: string, offerer?: string }) {
        super();
        this.wsUrl = wsUrl;
        this.feed = undefined as any;
        this.keepAliveTimer = undefined as any;
        this.connect(params);
    }

    static default(params?: { zone?: string, offerer?: string }) {
        return new IntentProvider(`${AORI_WS_API}/intents`, params);
    }

    async connect(params?: { zone?: string, offerer?: string }) {
        if (this.feed) this.feed.close();
        this.feed = new WebSocket(this.wsUrl);

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.wsUrl}`);
            this.keepAliveTimer = setInterval(() => {
                this.feed.ping();
            }, 10_000);
            this.subscribe(params);
            this.emit("ready");
            console.log(`🫡  Provider ready to send requests`);
        });

        this.feed.on("message", (msg) => {
            try {
                const payload: IntentSubscriptionEvent = JSON.parse(msg.toString());
                const { event, data } = payload;

                switch (event) {
                    case "intent":
                        this.emit("intent", payload);
                        break;
                    case "sequence":
                        this.emit("sequence", payload);
                        break;
                    case "fail":
                        this.emit("fail", payload);
                        break;
                    case "cancel":
                        this.emit("cancel", payload);
                        break;
                    case "settled":
                        this.emit("settled", payload);
                        break;
                    case "transfer":
                        this.emit("transfer", payload);
                        break;
                    case "withdraw":
                        this.emit("withdraw", payload);
                        break;
                }

            } catch (e: any) {
                console.error(e);
            }
        });

        this.feed.on("close", () => {
            console.log(`💥 Connection to ${this.wsUrl} closed, reconnecting...`);
            this.connect(params);
        });
    }

    async intent(signedOrder: SignedOrder) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "intent",
            params: [signedOrder]
        }));
    }

    async sequence(orders: SignedOrder[], extraData: string, witness: string) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "sequence",
            params: [{
                orders,
                extraData,
                witness
            }]
        }));
    }

    async subscribe(params?: { zone?: string, offerer?: string }) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "subscribe",
            params: [params]
        }));
    }

    static async sendIntent(
        signedOrder: SignedOrder,
        url: string = AORI_HTTP_API
    ): Promise<{ id: number } & ({ result: IntentSubscriptionEventData<"intent"> } | { error: { code: number, message: string } })> {
        const { data } = await axios.post(url, {
            id: 1,
            jsonrpc: "2.0",
            method: "intent",
            params: [signedOrder]
        });
        return data;
    }

    static async sequenceIntents(
        orders: SignedOrder[],
        extraData: string = "0x",
        witness: string = "0x",
        url: string = AORI_HTTP_API
    ): Promise<{ id: number } & ({ result: IntentSubscriptionEventData<"sequence"> } | { error: { code: number, message: string } })> {
        const { data } = await axios.post(url, {
            id: 1,
            jsonrpc: "2.0",
            method: "sequence",
            params: [{ orders, extraData, witness }]
        });
        return data;
    }
}