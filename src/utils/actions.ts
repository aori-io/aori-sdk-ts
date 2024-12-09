import { AoriV2__factory, ERC20__factory, WETH9__factory } from "../types";
import { AORI_V2_ADDRESS } from "./constants";
import { SignedOrder } from "./interfaces";

/*//////////////////////////////////////////////////////////////
                              ACTIONS
//////////////////////////////////////////////////////////////*/

export function settle(orders: SignedOrder[], extraData: string = "0x", witness: string = "0x") {
    if (orders.length == 0) throw "No orders to settle - pass in orders";
    orders.forEach((signedOrder) => {
        if (signedOrder.order.chainId != orders[0].order.chainId) throw "Not all orders are on the same chainId";
    });

    return {
        chainId: orders[0].order.chainId,
        to: AORI_V2_ADDRESS,
        value: 0,
        data: AoriV2__factory
            .createInterface()
            .encodeFunctionData("settle", [orders, extraData, witness])
    };
}

export function withdraw(to: string, token: string, amount: string, chainId?: undefined, extraData?: string, isTx?: true): { to: string, value: number, data: string };
export function withdraw(to: string, token: string, amount: string, chainId?: number, extraData?: string, isTx?: false): { to: string, value: number, data: string, chainId: number };
export function withdraw(to: string, token: string, amount: string, chainId?: number, extraData?: string, isTx?: boolean) {
    return {
        to: AORI_V2_ADDRESS,
        value: 0,
        data: AoriV2__factory
            .createInterface()
            .encodeFunctionData("withdraw", [to, token, amount, extraData ?? "0x"]),
        ...(isTx ? {} : { chainId })
    };
}

export function deposit(to: string, token: string, amount: string, chainId?: undefined, extraData?: string): { to: string, value: number, data: string };
export function deposit(to: string, token: string, amount: string, chainId?: number, extraData?: string): { to: string, value: number, data: string, chainId: number };
export function deposit(to: string, token: string, amount: string, chainId?: number, extraData?: string) {
    return {
        to: AORI_V2_ADDRESS,
        value: 0,
        data: AoriV2__factory.createInterface().encodeFunctionData("deposit", [to, token, amount, extraData ?? "0x"]),
        ...(chainId ? { chainId } : {})
    };
}


export function move(to: string, token: string, amount: string, chainId: number, extraData?: string, isTx?: true): { to: string, value: number, data: string };
export function move(to: string, token: string, amount: string, chainId: number, extraData?: string, isTx?: false): { to: string, value: number, data: string, chainId: number };
export function move(to: string, token: string, amount: string, chainId: number, extraData?: string, isTx?: boolean) {
    return {
        to: AORI_V2_ADDRESS,
        value: 0,
        data: AoriV2__factory.createInterface().encodeFunctionData("move", [to, token, amount, extraData ?? "0x"]),
        ...(isTx ? {} : { chainId })
    };
}

/*//////////////////////////////////////////////////////////////
                        OTHER ACTIONS
//////////////////////////////////////////////////////////////*/

export function approve(token: string, spender: string, amount: string): { to: string, value: number, data: string };
export function approve(token: string, spender: string, amount: string, chainId?: number): { to: string, value: number, data: string, chainId: number };
export function approve(token: string, spender: string, amount: string, chainId?: number | undefined) {
    return {
        to: token,
        value: 0,
        data: ERC20__factory.createInterface().encodeFunctionData("approve", [spender, amount]),
        ...(chainId ? { chainId } : {})
    };
}

export function wrap(token: string, amount: string): { to: string, value: number, data: string };
export function wrap(token: string, amount: string, chainId?: number): { to: string, value: number, data: string, chainId: number };
export function wrap(token: string, amount: string, chainId?: number | undefined) {
    return {
        to: token,
        value: Number(amount),
        data: WETH9__factory.createInterface().encodeFunctionData("deposit"),
        ...(chainId ? { chainId } : {})
    };
}

export function unwrap(token: string, amount: string): { to: string, value: number, data: string };
export function unwrap(token: string, amount: string, chainId?: number): { to: string, value: number, data: string, chainId: number };
export function unwrap(token: string, amount: string, chainId?: number | undefined) {
    return {
        to: token,
        value: 0,
        data: WETH9__factory.createInterface().encodeFunctionData("withdraw", [amount]),
        ...(chainId ? { chainId } : {})
    };
}