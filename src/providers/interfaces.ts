export interface QuoteRequested {
    inputToken: string;
    outputToken: string;
    inputAmount?: string;
    outputAmount?: string;
    chainId: number;
}

export interface OrderView {
    order: AoriOrder;
    orderHash: string;
    inputToken: string;
    inputAmount: string;
    inputChainId: number;
    outputToken: string;
    outputAmount: string;
    outputChainId: number;
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
    makerOrder: AoriOrder;
    makerOrderHash: string;
    takerOrder: AoriOrder;
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

export interface AoriOrder {
    offerer: string;
    inputToken: string;
    inputAmount: string;
    inputChainId: number;
    inputZone: string;
    outputToken: string;
    outputAmount: string;
    outputChainId: number;
    outputZone: string;
    startTime: string;
    endTime: string;
    salt: string;
    counter: number;
    toWithdraw: boolean;
}