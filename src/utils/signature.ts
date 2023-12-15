import { EIP_712_ORDER_TYPE, SEAPORT_CONTRACT_NAME } from "@opensea/seaport-js/lib/constants";
import { OrderComponents } from "@opensea/seaport-js/lib/types";
import { TypedDataEncoder, verifyTypedData, Wallet } from "ethers";
import { SEAPORT_ADDRESS, SEAPORT_VERSION } from "./constants";

export async function signOrder(wallet: Wallet, orderComponents: OrderComponents, chainId: number | string = 1): Promise<string> {
    return await wallet.signTypedData({
        name: SEAPORT_CONTRACT_NAME,
        version: SEAPORT_VERSION,
        chainId,
        verifyingContract: SEAPORT_ADDRESS
    }, EIP_712_ORDER_TYPE, orderComponents);
}

export async function verifyOrderSignature(orderComponents: OrderComponents, signature: string, chainId: number | string = 1): Promise<string> {
    return await verifyTypedData({
        name: SEAPORT_CONTRACT_NAME,
        version: SEAPORT_VERSION,
        chainId,
        verifyingContract: SEAPORT_ADDRESS
    }, EIP_712_ORDER_TYPE, orderComponents, signature)
}

export function computeOrderDigest(orderComponents: OrderComponents, chainId: number) {
    return TypedDataEncoder.hash({
        name: SEAPORT_CONTRACT_NAME,
        version: SEAPORT_VERSION,
        chainId,
        verifyingContract: SEAPORT_ADDRESS
    }, EIP_712_ORDER_TYPE, orderComponents);
}

