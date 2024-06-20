/*//////////////////////////////////////////////////////////////
                               TYPES
//////////////////////////////////////////////////////////////*/

export interface PriceRequest {
    fromAddress: string;
    inputToken: string;
    outputToken: string;
    inputAmount?: string;
    outputAmount?: string;
    chainId: number;
}
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type OutputAmountRequest = WithRequired<PriceRequest, "inputAmount">
export type InputAmountRequest = WithRequired<PriceRequest, "outputAmount">

export interface Calldata {
    outputAmount: bigint;
    to: string;
    value: number;
    data: string;
}
export type Quote = {
    outputAmount: bigint;
    price: number;
    gas: bigint;
}

export interface Quoter {
    name: () => string;
    getOutputAmountQuote: ({ inputToken, outputToken, inputAmount }: OutputAmountRequest) => Promise<Quote>;
    getInputAmountQuote: ({ inputToken, outputToken, outputAmount }: InputAmountRequest) => Promise<Quote>;
    generateCalldata: ({ inputToken, outputToken, inputAmount, outputAmount }: OutputAmountRequest) => Promise<Calldata>;
}