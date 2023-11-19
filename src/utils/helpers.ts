import { EIP_712_ORDER_TYPE, ItemType, OrderType } from "@opensea/seaport-js/lib/constants";
import { Order } from "@opensea/seaport-js/lib/types";
import { BigNumberish, Signer } from "ethers";
import { currentSeaportAddress, currentSeaportVersion, defaultConduitKey, defaultDuration, defaultOrderAddress, defaultZoneHash, maxSalt } from "./constants";

export type OrderWithCounter = Order & { parameters: { counter: BigNumberish } };

export async function formatIntoLimitOrder({
    offerer,
    zone = defaultOrderAddress,
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
    inputToken: string;
    inputTokenType?: ItemType;
    inputAmount: BigNumberish;
    outputToken: string;
    outputTokenType?: ItemType;
    outputAmount: BigNumberish;
    counter: string,
    chainId?: string | number;
}): Promise<OrderWithCounter> {

    const startTime = Math.floor(Date.now() / 1000); // seconds
    return {
        parameters: {
            offerer,
            zone,
            zoneHash: defaultZoneHash,
            startTime: `${startTime}`,
            endTime: `${startTime + defaultDuration}`,
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

export async function signOrder(wallet: Signer, order: Order & { parameters: { counter: BigNumberish } }, chainId: number | string = 1): Promise<string> {
    order.signature = await wallet.signTypedData({
        name: "Seaport",
        version: currentSeaportVersion,
        chainId,
        verifyingContract: currentSeaportAddress
    }, EIP_712_ORDER_TYPE, order.parameters);
    return order.signature;
}