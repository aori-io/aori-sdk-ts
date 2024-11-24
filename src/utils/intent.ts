import { AoriOrder, SignedOrder } from "./interfaces"

export type IntentSubscriptionEvent = {
    zone: string,
    timestamp: number
} & ({
        event: "intent",
        data: {
            orderHash: string,
            order: AoriOrder,
            extraData: string,
            signature: string
        }
    } | {
        event: "sequence",
        data: {
            orders: SignedOrder[],
            extraData: string,
            witness: string
        }
    } | {
        event: "fail",
        data: {
            orderHash: string,
            order: AoriOrder,
            extraData: string,
        }
    } | {
        event: "cancel",
        data: {
            orderHash: string,
            order: AoriOrder,
            extraData: string,
            transactionHash?: string
        }
    } | {
        event: "settled",
        data: {
            orderHash: string,
            order: AoriOrder,
            extraData: string,
            transactionHash: string
        }
    } | {
        event: "transfer",
        data: {
            from: string,
            account: string,
            token: string,
            chainId: number,
            amount: string,
            transactionHash: string
        }
    } | {
        event: "withdraw",
        data: {
            from: string,
            account: string,
            token: string,
            chainId: number,
            amount: string,
            transactionHash: string
        }
    }
)

export type IntentSubscriptionEventData<T extends IntentSubscriptionEvent["event"]> = IntentSubscriptionEvent & { event: T };

export type IntentWebsocketEventData = {
    ["ready"]: [],
    ["intent"]: [IntentSubscriptionEventData<"intent">],
    ["sequence"]: [IntentSubscriptionEventData<"sequence">],
    ["cancel"]: [IntentSubscriptionEventData<"cancel">],
    ["settled"]: [IntentSubscriptionEventData<"settled">],
    ["fail"]: [IntentSubscriptionEventData<"fail">],
    ["transfer"]: [IntentSubscriptionEventData<"transfer">],
    ["withdraw"]: [IntentSubscriptionEventData<"withdraw">]
};
