import { Wallet } from "ethers";
import { AoriOrder, SignedOrder } from "./interfaces";
import { signOrderWithExtradata } from "./signature";

export type CreateOrderParams = {
    offerer: string;
    inputToken: string;
    inputAmount: string;
    outputToken: string;
    outputAmount: string;
    zone: string;
    chainId: number;
    recipient?: string;
    startTime?: string;
    endTime?: string;
    toWithdraw?: boolean;
}

export function createOrder(params: CreateOrderParams, wallet?: undefined): AoriOrder;
export function createOrder(params: CreateOrderParams, wallet?: Wallet): SignedOrder;
export function createOrder(params: CreateOrderParams, wallet?: Wallet | undefined) {

    const {
        offerer,
        inputToken,
        inputAmount,
        outputToken,
        outputAmount,
        recipient,
        zone,
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

    return wallet ? signOrderWithExtradata(wallet, order) : order;
}