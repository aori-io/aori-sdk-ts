import { xykQuoterFactory } from "../adapters";
import { QuoteMaker } from "../base/QuoteMaker";

export function XYKMaker({
    wallet,
    apiUrl,
    feedUrl,
    takerUrl,
    apiKey,
    vaultContract,
    spreadPercentage = 0n,
    defaultChainId,
    cancelAfter = 12_000,
    cancelAllFirst = false,
    tokenA,
    tokenB
}: Parameters<typeof QuoteMaker>[0] & {
    tokenA?: string,
    tokenB?: string
}) {
    const xykMaker = QuoteMaker({
        wallet,
        apiUrl,
        feedUrl,
        takerUrl,
        vaultContract,
        spreadPercentage,
        apiKey,
        defaultChainId,
        cancelAfter,
        cancelAllFirst,
        quoter: xykQuoterFactory(vaultContract || wallet.address, defaultChainId, tokenA, tokenB)
    });

    return xykMaker;
}