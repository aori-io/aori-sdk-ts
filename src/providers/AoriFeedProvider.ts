import { WebSocket } from "ws";
import { AoriFeedEvents, AoriMethods, AORI_FEED, connectTo, SubscriptionEvents } from "../utils";
import { TypedEventEmitter } from "../utils/TypedEventEmitter";

export class AoriFeedProvider extends TypedEventEmitter<AoriFeedEvents> {

    broadcastSecret?: string;
    feedUrl: string;
    feed: WebSocket = null as any;

    keepAliveTimer: NodeJS.Timeout;

    constructor({ feedUrl, broadcastSecret }: { feedUrl: string, broadcastSecret?: string }) {
        super();

        this.feedUrl = feedUrl;
        this.keepAliveTimer = null as any;

        this.broadcastSecret = broadcastSecret;
    }

    static default(): AoriFeedProvider {
        return new AoriFeedProvider({ feedUrl: AORI_FEED });
    }

    async connect() {

        if (this.feed) this.feed.close();
        this.feed = connectTo(this.feedUrl);

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.feedUrl}`);
            this.keepAliveTimer = setInterval(() => {
                this.feed.ping();
            }, 10_000);
            this.emit("ready");
            console.log(`🫡  Provider ready to send requests`);
        });

        this.feed.on("message", (msg) => {
            const { id, result } = JSON.parse(msg.toString());
            const { type, data } = result;

            switch (type) {
                case AoriMethods.Ping:
                    console.log(`🏓 Sent ping, got pong from ${this.feedUrl}`);
                    break;
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

        this.feed.on("close", () => {
            console.log(`Got disconnected...`);
            setTimeout(() => {
                console.log(`Reconnecting...`);
                this.connect();
            }, 5_000);
        });
    }

    async subscribe() {
        await this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "aori_subscribeOrderbook",
            params: []
        }));
    }

    async broadcast(event: SubscriptionEvents, data: AoriFeedEvents[SubscriptionEvents][0]) {
        if (this.broadcastSecret === undefined) {
            throw new Error("No broadcast secret provided");
        }

        console.log(`Broadcasting ${event} with data ${JSON.stringify(data)} to websocket`);
        await this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: "aori_broadcast",
            params: [{
                secret: this.broadcastSecret,
                data: {
                    type: event,
                    data
                }
            }]
        }));
    }

    terminate() {
        if (this.keepAliveTimer) { clearInterval(this.keepAliveTimer); }
        this.feed.close();
    }

}