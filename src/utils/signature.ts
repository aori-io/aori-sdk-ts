import { getBytes, solidityPackedKeccak256, verifyMessage, Wallet } from "ethers";
import { AoriOrder, SignedOrder } from "./interfaces";
import { getOrderHash } from "./order";

/*//////////////////////////////////////////////////////////////
                        ORDER SIGNATURE
//////////////////////////////////////////////////////////////*/

export function getOrderMessage({ order, extraData = "0x" }: { order: AoriOrder, extraData?: string }) {
    return {
        hash: getOrderHash(order),
        digest: solidityPackedKeccak256(
            ["bytes32", "bytes"],
            [
                getOrderHash(order),
                extraData
            ]   
        )
    }
}

export function signOrderWithExtradata(wallet: Wallet, order: AoriOrder, extraData: string = "0x"): SignedOrder {
    const signature = wallet.signMessageSync(getBytes(getOrderMessage({ order, extraData }).digest));
    return { order, extraData, signature };
}

export function verifyOrderSignature(signedOrder: SignedOrder): boolean {
    return verifyMessage(
        getBytes(getOrderMessage(signedOrder).digest),
        signedOrder.signature
    ) == signedOrder.order.offerer;
}

/*//////////////////////////////////////////////////////////////
                        SEQUENCE SIGNATURE
//////////////////////////////////////////////////////////////*/

export function getSequenceMessage(orders: SignedOrder[], extraData: string) {
    const messages = orders.map(order => getOrderMessage(order));
    return solidityPackedKeccak256(
        ["bytes32[]", "bytes"],
        [
            messages,
            extraData
        ]
    )
}

export function signSequence(wallet: Wallet, orders: SignedOrder[], extraData: string = "0x"): { orders: SignedOrder[], extraData: string, signature: string } {
    const sequenceMessage = getSequenceMessage(orders, extraData);
    const signature = wallet.signMessageSync(getBytes(sequenceMessage));
    return { orders, extraData, signature };
}