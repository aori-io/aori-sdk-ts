import { WebSocket } from "ws";
import { AORI_HTTP_API, AORI_QUOTER_API, AORI_WS_API, AoriDataServerMethods, AoriMethods, AoriOrder, AoriQuoterMethods, AoriWebsocketEventData, rawCall, SubscriptionEvents, TypedEventEmitter } from "../utils";

export interface AoriSubscribeParams {
    tradeId?: string;
    address?: string;
    token?: string;
    orderType?: "rfq" | "limit";
    chainId?: number;
}

export class RFQProvider extends TypedEventEmitter<AoriWebsocketEventData> {

    feedUrl: string;
    feed: WebSocket;
    keepAliveTimer: NodeJS.Timeout;

    constructor(feedUrl: string) {
        super();

        this.feedUrl = feedUrl;
        this.feed = undefined as any;
        this.keepAliveTimer = null as any;
        this.connect();
    }

    static default(): RFQProvider {
        return new RFQProvider(AORI_WS_API);
    }

    async connect() {
        if (this.feed) this.feed.close();
        this.feed = new WebSocket(this.feedUrl);

        this.feed.on("open", () => {
            console.log(`⚡ Connected to ${this.feedUrl}`);
            this.keepAliveTimer = setInterval(() => {
                this.feed.ping();
            }, 10_000);
            this.subscribe({});
            this.emit("ready");
            console.log(`🫡  Provider ready to send requests`);
        });

        this.feed.on("message", (msg) => {
            try {
                const { tradeId, event, data, timestamp } = JSON.parse(msg.toString());
                const eventDetails = { tradeId, event, data, timestamp };

                switch (event) {
                    case SubscriptionEvents.QuoteRequested:
                        this.emit(SubscriptionEvents.QuoteRequested, eventDetails);
                        break;
                    case SubscriptionEvents.QuoteReceived:
                        this.emit(SubscriptionEvents.QuoteReceived, eventDetails);
                        break;
                    case SubscriptionEvents.TradeMatched:
                        this.emit(SubscriptionEvents.TradeMatched, eventDetails);
                        break;
                    case SubscriptionEvents.TradeSettled:
                        this.emit(SubscriptionEvents.TradeSettled, eventDetails);
                        break;
                    case SubscriptionEvents.TradeFailed:
                        this.emit(SubscriptionEvents.TradeFailed, eventDetails);
                        break;
                    case SubscriptionEvents.OrderCancelled:
                        this.emit(SubscriptionEvents.OrderCancelled, eventDetails);
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

    async respond(tradeId: string, params: { order: AoriOrder, signature: string }) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Respond,
            params: [{
                tradeId,
                ...params
            }]
        }));
    }

    async subscribe(params: AoriSubscribeParams) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Subscribe,
            params: [params]
        }));
    }
}


/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

// getPriceEstimate
export async function getPriceEstimate(inputToken: string, outputToken: string, inputAmount: number, chainId: number) {
    return rawCall(AORI_QUOTER_API, AoriQuoterMethods.PriceQuote, [{
        inputToken,
        outputToken,
        inputAmount,
        chainId
    }]);
}

// requestPartialQuote TODO
export async function requestPartialQuote() {

}

// requestQuote
export async function requestQuote(order: AoriOrder, signature: string) {
    return rawCall(AORI_HTTP_API, AoriMethods.Rfq, [{ order, signature }]);
}

// respondToQuote TODO 
export async function respondToQuote() {

}

// makeOrder TODO
export async function makeOrder(order: AoriOrder, signature: string) {
    return rawCall(AORI_HTTP_API, AoriMethods.Make, [{ order, signature }]);
}

// takeOrder TODO 
export async function takeOrder() {

}

// cancelOrder TODO
export async function cancelOrder(orderHash: string, signature: string) {
    return rawCall(AORI_HTTP_API, AoriMethods.Cancel, [{ orderHash, signature }]);

}
