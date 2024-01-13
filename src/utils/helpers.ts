import { solidityPackedKeccak256, verifyMessage } from "ethers";
import { AoriV2__factory } from "../types";
import { AoriMatchingDetails, AoriOrder } from "../utils";
import { AORI_ZONE_ADDRESS, defaultDuration, maxSalt } from "./constants";
import { OrderView } from "./interfaces";

/*//////////////////////////////////////////////////////////////
                    ORDER HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function formatIntoLimitOrder({
    offerer,
    startTime = Math.floor(Date.now() / 1000),
    endTime = startTime + defaultDuration,
    inputToken,
    inputAmount,
    inputChainId = 1,
    inputZone = AORI_ZONE_ADDRESS,
    outputToken,
    outputAmount,
    outputChainId = 1,
    outputZone = AORI_ZONE_ADDRESS,
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
    inputZone: string;
    outputToken: string;
    outputAmount: bigint;
    outputChainId: number;
    outputZone: string;
    counter: number;
}): Promise<AoriOrder> {

    return {
        offerer,
        inputToken,
        inputAmount: inputAmount.toString(),
        inputChainId,
        inputZone,
        outputToken,
        outputAmount: outputAmount.toString(),
        outputChainId,
        outputZone,
        startTime: `${startTime}`,
        endTime: `${endTime}`,
        salt: `${Math.floor(Math.random() * maxSalt)}`,
        counter,
        toWithdraw: true
    }
}

export function getOrderHash({
    offerer,
    inputToken,
    inputAmount,
    inputChainId,
    inputZone,
    outputToken,
    outputAmount,
    outputChainId,
    outputZone,
    startTime,
    endTime,
    salt,
    counter,
    toWithdraw
}: AoriOrder): string {
    return solidityPackedKeccak256([
        "address", // offerer
        // Input
        "address", // inputToken
        "uint256", // inputAmount
        "uint256", // inputChainId
        "address", // inputZone
        // Output
        "uint256", // outputToken
        "address", // outputAmount
        "uint256", // outputChainId
        "address", // outputZone
        // Other details
        "uint256", // startTime
        "uint256", // endTime
        "uint256", // salt
        "uint256", // counter
        "bool" // toWithdraw
    ], [
        offerer,
        inputToken,
        inputAmount,
        inputChainId,
        inputZone,
        outputToken,
        outputAmount,
        outputChainId,
        outputZone,
        startTime,
        endTime,
        salt,
        counter,
        toWithdraw
    ]);
}

export function getOrderSigner(order: AoriOrder, signature: string) {
    return verifyMessage(getOrderHash(order), signature);
}

export function toOrderView(order: AoriOrder, signature?: string, isPublic: boolean = true): OrderView {
    return {
        orderHash: getOrderHash(order),
        order,
        signature,
        inputToken: order.inputToken,
        inputAmount: order.inputAmount,
        inputChainId: order.inputChainId,
        inputZone: order.inputZone,
        outputToken: order.outputToken,
        outputAmount: order.outputAmount,
        outputChainId: order.outputChainId,
        outputZone: order.outputZone,

        rate: parseFloat(order.outputAmount) / parseFloat(order.inputAmount),
        createdAt: Date.now(),
        lastUpdatedAt: Date.now(),
        isPublic
    }
}

/*//////////////////////////////////////////////////////////////
                    MATCHING HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export function getMatchingHash({
    makerSignature,
    takerSignature,
    seatNumber,
    seatHolder,
    seatPercentOfFees
}: AoriMatchingDetails): string {
    return solidityPackedKeccak256([
        "bytes",
        "bytes",
        "uint256",
        "address",
        "uint256"
    ], [
        makerSignature,
        takerSignature,
        seatNumber,
        seatHolder,
        seatPercentOfFees
    ])
}

export function getMatchingSigner(matching: AoriMatchingDetails, signature: string) {
    return verifyMessage(getMatchingHash(matching), signature);
}

export function calldataToSettleOrders({
    makerOrder,
    takerOrder,
    makerSignature,
    takerSignature,
    blockDeadline,
    seatNumber,
    seatHolder,
    seatPercentOfFees
}: AoriMatchingDetails, signature: string) {
    return AoriV2__factory.createInterface().encodeFunctionData("settleOrders", [{
        makerOrder,
        takerOrder,
        makerSignature,
        takerSignature,
        blockDeadline,
        seatNumber,
        seatHolder,
        seatPercentOfFees
    }, signature]);
}