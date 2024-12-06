import { solidityPackedKeccak256, Wallet, ZeroAddress } from "ethers";
import { AoriOrder, SignedOrder } from "./interfaces";
import { signOrderWithExtradata } from "./signature";
import { AORI_V2_ADDRESS } from "./constants";

/*//////////////////////////////////////////////////////////////
                        ORDER SIGNATURE
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