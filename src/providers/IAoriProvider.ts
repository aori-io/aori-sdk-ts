import { TransactionRequest } from "ethers";
import { AoriMatchingDetails, AoriMethods, AoriMethodsEvents, AoriOrder, CreateLimitOrderParams, QuoteRequested, ViewOrderbookQuery } from "../utils";

export interface IAoriProvider {
    connect(): Promise<void>;
    terminate(): void;

    setDefaultChainId(chainId: number): void;
    
    createLimitOrder(params: CreateLimitOrderParams): Promise<{
        signature: string;
        order: AoriOrder;
        orderHash: string;
    }>;

    createMatchingOrder(order: AoriOrder, feeInBips: bigint): Promise<{
        signature: string;
        order: AoriOrder;
        orderHash: string;
    }>;

    ping(): Promise<AoriMethodsEvents[AoriMethods.Ping][0]>;
    accountDetails(): Promise<AoriMethodsEvents[AoriMethods.AccountDetails][0]>;
    viewOrderbook(query?: ViewOrderbookQuery): Promise<AoriMethodsEvents[AoriMethods.ViewOrderbook][0]>;
    makeOrder(params: { order: AoriOrder, signature?: string, isPrivate?: boolean }): Promise<AoriMethodsEvents[AoriMethods.MakeOrder][0]>;
    takeOrder(params: { orderHash: string, order: AoriOrder, signature?: string, seatId?: number }): Promise<AoriMethodsEvents[AoriMethods.TakeOrder][0]>;
    cancelOrder(params: {
        orderHash: string,
        siweMessage?: string,
        siweNonce?: string,
        signature: string,
    } | {
        orderHash: string,
        apiKey: string,
    }): Promise<AoriMethodsEvents[AoriMethods.CancelOrder][0]>;
    cancelAllOrders(params: {
        apiKey: string
        tag?: string,
    } | {
        siweMessage?: string,
        siweNonce?: string,
        signature: string,
        tag?: string,
    }): Promise<AoriMethodsEvents[AoriMethods.CancelAllOrders]>;
    failOrder(params: { matching: AoriMatchingDetails, matchingSignature: string, makerMatchingSignature: string }): Promise<AoriMethodsEvents[AoriMethods.FailOrder][0]>;
    requestQuote(params: QuoteRequested): Promise<void>;
    requestSwap(params: { order: AoriOrder, signature: string }): Promise<void>;
    quote(params: QuoteRequested & { delay?: number }): Promise<AoriMethodsEvents[AoriMethods.Quote][0]>;

    sendTransaction(tx: TransactionRequest): Promise<string>;
    formatOrder(order: AoriOrder): string;
    rawCall<T>({
        method,
        params
    }: { method: AoriMethods | string, params: [T] | [] }, apiUrl: string): Promise<AoriMethodsEvents[keyof AoriMethodsEvents][0]>;
}