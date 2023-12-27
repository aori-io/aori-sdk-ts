import { ItemType, OrderType } from "@opensea/seaport-js/lib/constants";
import { Order } from "@opensea/seaport-js/lib/types";
import { BigNumberish } from "ethers";
import { AORI_ZONE_ADDRESS, defaultConduitKey, defaultDuration, defaultZoneHash, maxSalt } from "./constants";

export type OrderWithCounter = Order & { parameters: { counter: BigNumberish } };

export async function formatIntoLimitOrder({
    offerer,
    zone = AORI_ZONE_ADDRESS,
    startTime = Math.floor(Date.now() / 1000),
    endTime = startTime + defaultDuration,
    inputToken,
    inputTokenType = ItemType.ERC20,
    inputAmount,
    outputToken,
    outputTokenType = ItemType.ERC20,
    outputAmount,
    counter
}: {
    offerer: string;
    zone?: string;
    startTime?: number;
    endTime?: number;
    inputToken: string;
    inputTokenType?: ItemType;
    inputAmount: bigint;
    outputToken: string;
    outputTokenType?: ItemType;
    outputAmount: bigint;
    counter: string
}): Promise<OrderWithCounter> {

    return {
        parameters: {
            offerer,
            zone,
            zoneHash: defaultZoneHash,
            startTime: `${startTime}`,
            endTime: `${endTime}`,
            orderType: OrderType.PARTIAL_RESTRICTED,
            offer: [{
                itemType: inputTokenType,
                token: inputToken,
                identifierOrCriteria: "0",
                startAmount: inputAmount.toString(),
                endAmount: inputAmount.toString()
            }],
            consideration: [{
                itemType: outputTokenType,
                token: outputToken,
                identifierOrCriteria: "0",
                startAmount: outputAmount.toString(),
                endAmount: outputAmount.toString(),
                recipient: offerer
            }],
            totalOriginalConsiderationItems: 1,
            salt: `${Math.floor(Math.random() * maxSalt)}`,
            conduitKey: defaultConduitKey,
            counter
        },
        signature: ""
    }
}

