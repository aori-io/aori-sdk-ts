/*//////////////////////////////////////////////////////////////
                            ZONE
//////////////////////////////////////////////////////////////*/

import { getBytes, verifyMessage } from "ethers";
import { AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES, SUPPORTED_AORI_CHAINS } from "./constants";
import { AoriOrder, AoriOrderWithOptionalOutputAmount } from "./interfaces";
import { getOrderHash, isValidSignature } from "../providers";

export function getDefaultZone(chainId: number) {
    const zoneOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zoneOnChain) throw new Error(`Chain ${chainId} is not supported yet!`);
    return zoneOnChain;
}

export function isZoneSupported(chainId: number, address: string) {
    const zoneOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zoneOnChain) return false;
    return zoneOnChain.toLowerCase() == address.toLowerCase();
}

/*//////////////////////////////////////////////////////////////
                            ORDER
//////////////////////////////////////////////////////////////*/

export function getOrderSigner(order: AoriOrder, signature: string) {
    return verifyMessage(getBytes(getOrderHash(order)), signature);
}

export async function validateOrder(order: AoriOrder, signature: string): Promise<string | null> {

    // Check if chain is supported
    if (!SUPPORTED_AORI_CHAINS.has(order.chainId)) return `Chain ${order.chainId} not supported`;

    if (signature == undefined || signature == "" || signature == null) return "No signature provided";

    if (!isZoneSupported(order.chainId, order.zone)) return `Zone ${order.zone} on ${order.chainId} not supported`;

    if (BigInt(order.startTime) > BigInt(order.endTime)) return `Start time (${order.startTime}) cannot be after end (${order.endTime}) time`;
    if (BigInt(order.endTime) < BigInt(Math.floor(Date.now() / 1000))) return `End time (${order.endTime}) cannot be in the past`;

    // Verify that the signature of the taker order is valid
    let orderMessageSigner;
    try {
        orderMessageSigner = getOrderSigner(order, signature);
    } catch (e: any) {
        return `Signature signer could not be retrieved: ${e.message}`;
    }

    try {
        // make isValidSignature call too
        if (orderMessageSigner.toLowerCase() !== order.offerer.toLowerCase()) {
            if (!(await isValidSignature(order.chainId, order.offerer, getOrderHash(order), signature))) {
                return `Signature (${signature}) appears to be invalid via calling isValidSignature on ${order.offerer} on chain ${order.chainId} - order hash: ${getOrderHash(order)}`
            }
        }
    } catch (e: any) {
        return `isValidSignature call failed: ${e.message}`;
    }

    return null;
}

export function validateMakerOrderMatchesTakerOrder(makerOrder: AoriOrder, takerOrder: AoriOrder | AoriOrderWithOptionalOutputAmount): string | null {
    if (takerOrder.chainId != makerOrder.chainId) return `Taker order is on chain ${takerOrder.chainId} but maker order is on chain ${makerOrder.chainId}`;
    if (takerOrder.zone.toLowerCase() != makerOrder.zone.toLowerCase()) return `Taker order is on zone ${takerOrder.zone} but maker order is on zone ${makerOrder.zone}`;

    // Verify that the takerOrder and the makerOrder use the same token
    if (takerOrder.inputToken.toLowerCase() != makerOrder.outputToken.toLowerCase()) return `Taker order is on token ${takerOrder.inputToken} but maker order is on token ${makerOrder.outputToken}`;
    if (takerOrder.outputToken.toLowerCase() != makerOrder.inputToken.toLowerCase()) return `Taker order is on token ${takerOrder.outputToken} but maker order is on token ${makerOrder.inputToken}`;

    return null;
}

/*//////////////////////////////////////////////////////////////
                             FEE
//////////////////////////////////////////////////////////////*/

export const BIPS_DENOMINATOR = 10_000n;

export function withFee(amount: bigint, feeInBips: bigint) {
    return amount * (BIPS_DENOMINATOR + feeInBips) / BIPS_DENOMINATOR;
}

export function withoutFee(amount: bigint, feeInBips: bigint) {
    return amount * BIPS_DENOMINATOR / (BIPS_DENOMINATOR + feeInBips);
}