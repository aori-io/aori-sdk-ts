import { getBytes, solidityPackedKeccak256, Wallet } from "ethers";
import { AoriOrder, SignedOrder } from "./interfaces";
import { getOrderHash } from "../providers";

export function getSignatureMessage(order: SignedOrder) {
    return solidityPackedKeccak256(
        ["bytes32", "bytes"],
        [
            getOrderHash(order.order),
            order.extraData
        ]
    )
}

export function signOrderWithExtra(wallet: Wallet, order: AoriOrder, extraData: string): SignedOrder {
    const signature = wallet.signMessageSync(
        getBytes(getSignatureMessage({ order, extraData, signature: "" }))
    );

    return {
        order,
        extraData,
        signature,
    }
}

export function getSequenceMessage(orders: SignedOrder[], extraData: string) {
    const messages = orders.map(order => getSignatureMessage(order));
    return solidityPackedKeccak256(
        ["bytes32[]", "bytes"],
        [
            messages,
            extraData
        ]
    )
}

export function signSequence(wallet: Wallet, orders: SignedOrder[], extraData: string): string {
    const sequenceMessage = getSequenceMessage(orders, extraData);
    return wallet.signMessageSync(getBytes(sequenceMessage));
}