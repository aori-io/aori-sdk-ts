import { solidityPackedKeccak256, Wallet, ZeroAddress } from "ethers";
import { AoriOrder, SignedOrder } from "./interfaces";
import { signOrderWithExtradata, verifyOrderSignature } from "./signature";
import { AORI_V2_ADDRESS, SUPPORTED_AORI_CHAINS } from "./constants";

/*//////////////////////////////////////////////////////////////
                        ORDER HASH
//////////////////////////////////////////////////////////////*/

export function getOrderHash({
    offerer,
    inputToken,
    inputAmount,
    outputToken,
    outputAmount,
    recipient,
    zone,
    chainId,
    startTime,
    endTime,
    toWithdraw
}: AoriOrder): string {
    return solidityPackedKeccak256([
        "address", // offerer
        "address", // inputToken
        "uint256", // inputAmount
        "address", // outputToken
        "uint256", // outputAmount
        "address", // recipient
        // =====
        "address", // zone
        "uint160", // chainId
        // =====
        "uint32", // startTime
        "uint32", // endTime
        "bool" // toWithdraw
    ], [
        offerer, inputToken, inputAmount, outputToken, outputAmount, recipient, zone, chainId,
        startTime, endTime, toWithdraw
    ]);
}

/*//////////////////////////////////////////////////////////////
                        CREATE ORDER
//////////////////////////////////////////////////////////////*/

export type CreateOrderParams = {
    offerer: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
    zone?: string;
    chainId: number;
    recipient?: string;
    startTime?: string;
    endTime?: string;
    toWithdraw?: boolean;
}

export function createOrder(params: CreateOrderParams, wallet?: undefined): AoriOrder;
export function createOrder(params: CreateOrderParams, wallet?: Wallet, extraData?: string): SignedOrder;
export function createOrder(params: CreateOrderParams, wallet?: Wallet | undefined, extraData?: string) {

    const {
        offerer,
        inputToken,
        inputAmount,
        outputToken,
        outputAmount,
        recipient,
        zone = ZeroAddress,
        startTime,
        endTime,
        chainId,
        toWithdraw
    } = params;
    
    const order: AoriOrder = {
        offerer,
        inputToken,
        inputAmount,
        outputToken,
        outputAmount,
        recipient: recipient || offerer,
        startTime: startTime || (Math.floor((Date.now() - 10 * 60 * 1000) / 1000)).toString(), // 10 minutes ago
        endTime: endTime || (Math.ceil((Date.now() + 10 * 60 * 1000) / 1000)).toString(), // 10 minutes from now
        zone,
        chainId,
        toWithdraw: toWithdraw || true
    }

    return wallet ? signOrderWithExtradata(wallet, order, extraData) : order;
}

export const createLimitOrder = createOrder;
export const createIntent = createOrder;

/*//////////////////////////////////////////////////////////////
                        VALIDATE ORDER
//////////////////////////////////////////////////////////////*/

export function validateOrder({ order, signature, extraData }: SignedOrder): string | null {
    // Validate chain
    if (!SUPPORTED_AORI_CHAINS.has(order.chainId)) return "Unsupported chain";

    // Validate time
    if (BigInt(order.startTime) > BigInt(Date.now() / 1000)) return "Start time is in the future";
    if (BigInt(order.endTime) < BigInt(Date.now() / 1000)) return "End time is in the past";
    if (BigInt(order.startTime) > BigInt(order.endTime)) return "Start time is after end time";

    // Verify signature is valid
    if (!verifyOrderSignature({ order, signature, extraData })) return "Invalid signature";

    return null;
}