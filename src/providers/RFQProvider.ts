import { WebSocket } from "ws";
import { AoriOrder, DetailsToExecute, TypedEventEmitter } from "../utils";

export enum AoriMethods {
    Ping = "aori_ping",
    Version = "aori_version",
    SupportedChains = "aori_supportedChains",
    Rfq = "aori_rfq",
    Respond = "aori_respond",
    Subscribe = "aori_subscribe"
}

export enum SubscriptionEvents {
    QuoteRequested = "QuoteRequested",
    QuoteReceived = "QuoteReceived",
    CalldataToExecute = "CalldataToExecute",
}

export interface QuoteRequestedDetails {
    rfqId: string,
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string,
    zone: string,
    chainId: number
}

export type RfqEvents = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [QuoteRequestedDetails],
    [SubscriptionEvents.QuoteReceived]: [QuoteRequestedDetails & { outputAmount: string }],
    [SubscriptionEvents.CalldataToExecute]: [{ rfqId: string, detailsToExecute: DetailsToExecute }]
}

export class RFQProvider extends TypedEventEmitter<RfqEvents> {

    feedUrl: string;
    feed: WebSocket;
    keepAliveTimer: NodeJS.Timeout;

    constructor(feedUrl: string) {
        super();

        this.feedUrl = feedUrl;
        this.feed = new WebSocket(feedUrl);

        this.keepAliveTimer = null as any;

        this.connect();
    }

    static default(): RFQProvider {
        return new RFQProvider("");
    }

    async connect() {
        if (this.feed) this.feed.close();
        this.feed = new WebSocket(this.feedUrl);

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.feedUrl}`);
            this.keepAliveTimer = setInterval(() => {
                this.feed.ping();
            }, 10_000);
            this.emit("ready");
            console.log(`🫡  Provider ready to send requests`);
        });

        this.feed.on("message", (msg) => {
            try {
                const { id, result } = JSON.parse(msg.toString());
                const { type, data } = result;

                switch (type) {
                    case SubscriptionEvents.QuoteRequested:
                        this.emit(SubscriptionEvents.QuoteRequested, data);
                        break;
                    case SubscriptionEvents.QuoteReceived:
                        this.emit(SubscriptionEvents.QuoteReceived, data);
                        break;
                    case SubscriptionEvents.CalldataToExecute:
                        this.emit(SubscriptionEvents.CalldataToExecute, data);
                        break;
                }
            } catch (e: any) {
                console.log(e);
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

    async respond(rfqId: string, params: { order: AoriOrder, signature: string }) {
        this.feed.send(JSON.stringify({
            id: 1,
            method: AoriMethods.Respond,
            params: {
                rfqId,
                ...params
            }
        }));
    }
}