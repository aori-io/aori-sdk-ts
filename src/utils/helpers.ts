import { AoriOrder } from "../providers";
import { AORI_ZONE_ADDRESS, defaultDuration, maxSalt } from "./constants";

// export type OrderWithCounter = Order & { parameters: { counter: BigNumberish } };

export async function formatIntoLimitOrder({
    offerer,
    chainId = 1,
    zone = AORI_ZONE_ADDRESS,
    startTime = Math.floor(Date.now() / 1000),
    endTime = startTime + defaultDuration,
    inputToken,
    inputAmount,
    inputChainId,
    outputToken,
    outputAmount,
    outputChainId,
    counter
}: {
    offerer: string;
    chainId?: number;
    zone?: string;
    startTime?: number;
    endTime?: number;
    inputToken: string;
    inputAmount: bigint;
    inputChainId: number;
    outputToken: string;
    outputAmount: bigint;
    outputChainId: number;
    counter: number;
}): Promise<AoriOrder> {

    return {
        offerer,
        inputToken,
        inputAmount: inputAmount.toString(),
        inputChainId,
        outputToken,
        outputAmount: outputAmount.toString(),
        outputChainId,
        startTime: `${startTime}`,
        endTime: `${endTime}`,
        salt: `${Math.floor(Math.random() * maxSalt)}`,
        counter,
        zone,
        toWithdraw: true
    }

    // return {
    //     parameters: {
    //         offerer,
    //         zone,
    //         zoneHash: defaultZoneHash,
    //         startTime: `${startTime}`,
    //         endTime: `${endTime}`,
    //         orderType: OrderType.PARTIAL_RESTRICTED,
    //         offer: [{
    //             itemType: inputTokenType,
    //             token: inputToken,
    //             identifierOrCriteria: "0",
    //             startAmount: inputAmount.toString(),
    //             endAmount: inputAmount.toString()
    //         }],
    //         consideration: [{
    //             itemType: outputTokenType,
    //             token: outputToken,
    //             identifierOrCriteria: "0",
    //             startAmount: outputAmount.toString(),
    //             endAmount: outputAmount.toString(),
    //             recipient: offerer
    //         }],
    //         totalOriginalConsiderationItems: 1,
    //         salt: `${Math.floor(Math.random() * maxSalt)}`,
    //         conduitKey: defaultConduitKey,
    //         counter
    //     },
    //     signature: ""
    // }
}

export function getOrderHash(order: AoriOrder): string {
    return "";
}

export function getMatchingHash(): string {
    return "";
}