import { OrderWithCounter } from "../utils";

export interface OrderToExecute {

    // Relevant order details
    makerOrderHash: string;
    makerParameters: OrderWithCounter["parameters"];
    takerOrderHash: string;
    takerParameters: OrderWithCounter["parameters"];
    matchingHash: string;

    // Verification
    chainId: number;
    to: string;
    value: number;
    data: string;
    blockDeadline: number;

    // Vanity
    maker: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
}

export interface QuoteRequested {
    inputToken: string;
    outputToken: string;
    inputAmount?: string;
    outputAmount?: string;
    chainId: number;
}

export interface OrderView {
    order: OrderWithCounter,
    orderHash: string,
    inputToken: string,
    outputToken: string,
    inputAmount: string;
    outputAmount: string;
    chainId: number;
    rate: number;
    createdAt: number;
    isPublic: boolean;
}

export interface ViewOrderbookQuery {
    signature?: string;
    offerer?: string;
    orderHash?: string;
    query?: {
        base: string;
        quote: string;
    };
    chainId?: number;
    sortBy?: "createdAt_asc" | "createdAt_desc" | "rate_asc" | "rate_desc";
    inputAmount?: string;
    outputAmount?: string;
}

export interface MatchingDetails {
    matchingHash: string;
    makerOrder: OrderWithCounter;
    makerOrderHash: string;
    takerOrder: OrderWithCounter;
    takerOrderHash: string;

    chainId: number;
    to: string;
    value: number;
    data: string;
    blockDeadline: number;

    maker: string;
    taker: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
}