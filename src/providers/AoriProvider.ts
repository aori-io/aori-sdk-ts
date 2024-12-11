import { WebSocket } from "isomorphic-ws";
import { AORI_HTTP_API, AORI_QUOTER_API, AORI_WS_API, AoriMethods, AoriOrder, AoriQuoterMethods, rawCall, SubscriptionEvents, TypedEventEmitter, SubscriptionEventData, SignedOrder, SubscriptionEvent } from "../utils";
import axios from "axios";

type AoriEventData = {
    ["ready"]: [],
    [SubscriptionEvents.QuoteRequested]: [SubscriptionEventData<SubscriptionEvents.QuoteRequested>],
    [SubscriptionEvents.OrderCancelled]: [SubscriptionEventData<SubscriptionEvents.OrderCancelled>],
    [SubscriptionEvents.Sequenced]: [SubscriptionEventData<SubscriptionEvents.Sequenced>],
    [SubscriptionEvents.TradeSettled]: [SubscriptionEventData<SubscriptionEvents.TradeSettled>],
    [SubscriptionEvents.TradeFailed]: [SubscriptionEventData<SubscriptionEvents.TradeFailed>],
}

export class AoriProvider extends TypedEventEmitter<AoriEventData> {

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

    static default(): AoriProvider {
        return new AoriProvider(AORI_WS_API);
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
                const { tradeId, event, data, timestamp, zone, chainId } = JSON.parse(msg.toString());
                const eventDetails = { tradeId, event, data, timestamp, zone, chainId };

                switch (event) {
                    case SubscriptionEvents.QuoteRequested:
                        this.emit(SubscriptionEvents.QuoteRequested, eventDetails);
                        break;
                    case SubscriptionEvents.Sequenced:
                        this.emit(SubscriptionEvents.Sequenced, eventDetails);
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

    async intent(signedOrder: SignedOrder) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Intent,
            params: [signedOrder]
        }));
    }

    async sequence(orders: SignedOrder[], extraData: string, witness: string) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Sequence,
            params: [{
                orders,
                extraData,
                witness
            }]
        }));
    }
    
    // TODO: Add params
    async subscribe(params: {}) {
        this.feed.send(JSON.stringify({
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Subscribe,
            params: [params]
        }));
    }

    /*//////////////////////////////////////////////////////////////
                             STATIC METHODS
    //////////////////////////////////////////////////////////////*/

    static async sendIntent(
        signedOrder: SignedOrder,
        url: string = AORI_HTTP_API
    ): Promise<{ id: number } & ({ result: SubscriptionEventData<SubscriptionEvents.QuoteRequested> } | { error: { code: number, message: string } })> {
        const { data } = await axios.post(url, {
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Intent,
            params: [signedOrder]
        });
        return data;
    }

    static async sequenceIntents(
        orders: SignedOrder[],
        extraData: string = "0x",
        witness: string = "0x",
        url: string = AORI_HTTP_API
    ): Promise<{ id: number } & ({ result: SubscriptionEventData<SubscriptionEvents.Sequenced> } | { error: { code: number, message: string } })> {
        const { data } = await axios.post(url, {
            id: 1,
            jsonrpc: "2.0",
            method: AoriMethods.Sequence,
            params: [{ orders, extraData, witness }]
        });
        return data;
    }
}


/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

interface AoriGetPriceEstimateParams {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    chainId: number;
}

// getPriceEstimate
export async function getPriceEstimate(params: AoriGetPriceEstimateParams) {
    return await rawCall(AORI_QUOTER_API, AoriQuoterMethods.PriceQuote, [{
        inputToken: params.inputToken,
        outputToken: params.outputToken,
        inputAmount: params.inputAmount,
        chainId: params.chainId
    }]);
}


interface AoriGetPartialQuoteParams {
    inputToken: string;
    outputToken: string;
    inputAmount: string;
    chainId: number;
}

// requestPartialQuote
export async function requestPartialQuote(params: AoriGetPartialQuoteParams) {
    return await rawCall(AORI_HTTP_API, AoriMethods.Rfq, [{
        inputToken: params.inputToken,
        outputToken: params.outputToken,
        inputAmount: params.inputAmount,
        chainId: params.chainId
    }]);
}

interface AoriRequestQuoteParams {
    order: AoriOrder;
    signature: string;
}

// requestQuote
export async function requestQuote(params: AoriRequestQuoteParams) {
    return await rawCall(AORI_HTTP_API, AoriMethods.Rfq, [{
        order: params.order,
        signature: params.signature
    }]);
}

interface AoriCancelParams {
    tradeId: string;
    signature: string;
}

// cancelOrder
export async function cancelOrder(params: AoriCancelParams) {
    return await rawCall(AORI_HTTP_API, AoriMethods.Cancel, [{
        tradeId: params.tradeId,
        signature: params.signature
    }]);
}

export async function sendRFQ(req: SignedOrder | { order: AoriOrder, signature: string }, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<SubscriptionEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Rfq, [req]);
}

export async function sendIntent(req: SignedOrder, apiUrl: string = AORI_HTTP_API) {
    return await rawCall<SubscriptionEventData<SubscriptionEvents.QuoteRequested>>(apiUrl, AoriMethods.Intent, [req]);
}