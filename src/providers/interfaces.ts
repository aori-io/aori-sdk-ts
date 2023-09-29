export interface OrderToExecute {
    parameters: {
        makerOrders: any[];
        takerOrder: any;
        fulfillments: any[];
        blockDeadline: number;
        chainId: number;
    },
    signature: string;
    contractCall: {
        to: string;
        value: number;
        data: string;
    }
}

export interface OrderView {
    order: {
        parameters: any;
        signature: string;
    },
    orderHash: string,
    inputToken: string,
    outputToken: string,
    inputAmount: number;
    outputAmount: number;
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
    }
}