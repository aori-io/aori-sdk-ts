import { OrderWithCounter } from "../utils";

export interface OrderToExecute {

    // Relevant hashes
    matchingHash: string;
    makerOrderHash: string;
    takerOrderHash: string;

    chainId: number;
    to: string;
    value: number;
    data: string;
    blockDeadline: number;

    // Additional parameters
    parameters: {
        makerOrders: OrderWithCounter[];
        takerOrder: OrderWithCounter;
    }
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