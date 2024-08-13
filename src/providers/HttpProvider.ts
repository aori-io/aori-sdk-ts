interface AoriPartialRequest {
    address: string,
    inputToken: string,
    outputToken: string,
    inputAmount?: string,
    outputAmount?: string,
    zone?: string,
    chainId: number,
    deadline?: number
}

export async function requestPriceQuote(req: AoriPartialRequest) {
    // TODO:
}

export async function requestForQuote(req: AoriPartialRequest) {
    // TODO: 
}