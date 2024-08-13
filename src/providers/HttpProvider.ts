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
    // 
}

export async function requestForQuote(req: AoriPartialRequest) {
    // Create
}