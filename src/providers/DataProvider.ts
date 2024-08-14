import axios from "axios";
import { BytesLike, id, JsonRpcError, JsonRpcResult, verifyMessage } from "ethers";
import { AORI_DATA_PROVIDER_APIS, CREATE3FACTORY_DEPLOYED_ADDRESS, rawCall } from "../utils";
import { AoriDataMethods, AoriMethods } from "../utils/interfaces";

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

function DATA_URL() {
    return AORI_DATA_PROVIDER_APIS[Math.floor(Math.random() * AORI_DATA_PROVIDER_APIS.length)]
}

export function getBlockNumber(chainId: number) {
    return rawCall<{ blockNumber: number }>(DATA_URL(), AoriDataMethods.GetBlockNumber, [{ chainId }])
        .then(({ blockNumber}) => blockNumber)
}

export function getNonce(chainId: number, address: string) {
    return rawCall<{ nonce: number }>(DATA_URL(), AoriDataMethods.GetNonce, [{ chainId, address }])
        .then(({ nonce }) => nonce);
}

export function getFeeData(chainId: number): Promise<{
    gasPrice: string,
    maxFeePerGas: string | null,
    maxPriorityFeePerGas: string | null,
}> {

    return rawCall<{ gasPrice: string, maxFeePerGas: string, maxPriorityFeePerGas: string }>(DATA_URL(), AoriDataMethods.GetFeeData, [{ chainId }])
        .then(({ gasPrice, maxFeePerGas, maxPriorityFeePerGas }) => ({ gasPrice, maxFeePerGas, maxPriorityFeePerGas }));
}

export function estimateGas({ chainId, to, value, data: _data, from }: { chainId: number; to: string; value: number; data: string; from?: string }): Promise<string> {
    return rawCall<{ gasData: string }>(DATA_URL(), AoriDataMethods.EstimateGas, [{ chainId, to, value, data: _data, from }])
        .then(({ gasData }) => gasData);
}

export function isValidSignature(chainId: number, address: string, hash: BytesLike, signature: string): Promise<boolean> {
    return rawCall<{ isValidSignature: boolean }>(DATA_URL(), AoriDataMethods.IsValidSignature, [{ chainId, vault: address, hash: hash.toString(), signature }])
        .then(({ isValidSignature }) => isValidSignature);
}

export function hasOrderSettled(chainId: number, orderHash: string, zone?: string): Promise<boolean> {
    return rawCall<{ hasOrderSettled: boolean }>(DATA_URL(), AoriDataMethods.HasOrderSettled, [{ chainId, orderHash, zone }])
        .then(({ hasOrderSettled }) => hasOrderSettled);
}

export function getAoriCounter(chainId: number, zone: string, address: string): Promise<number> {
    return rawCall<{ counter: number }>(DATA_URL(), AoriDataMethods.GetAoriCounter, [{ chainId, zone, address }])
        .then(({ counter }) => counter);
}

export function getNativeBalance(chainId: number, address: string): Promise<bigint> {
    return rawCall<{ nativeBalance: string }>(DATA_URL(), AoriDataMethods.GetNativeBalance, [{ chainId, address }])
        .then(({ nativeBalance }) => BigInt(nativeBalance));
}

export function getTokenBalance(chainId: number, address: string, token: string): Promise<bigint> {
    return rawCall<{ tokenBalance: string }>(DATA_URL(), AoriDataMethods.GetTokenBalance, [{ chainId, address, token }])
        .then(({ tokenBalance }) => BigInt(tokenBalance));
}

export function getTokenAllowance(chainId: number, address: string, token: string, spender: string): Promise<bigint> {
    return rawCall<{ tokenAllowance: string }>(DATA_URL(), AoriDataMethods.GetTokenAllowance, [{  chainId, address, token, spender }])
        .then(({ tokenAllowance }) => BigInt(tokenAllowance));
}

export function getTokenDetails(chainId: number, token: string): Promise<{ name: string, symbol: string, decimals: number }> {
    return rawCall<{ name: string, symbol: string, decimals: number }>(DATA_URL(), AoriDataMethods.GetTokenDetails, [{ chainId, token }])
        .then(({ name, symbol, decimals }) => ({ name, symbol, decimals }));
}

export function getSeatDetails(seatId: number): Promise<{ seatOwner: string, seatScore: number }> {
    return rawCall<{ seatId: number, seatOwner: string, seatScore: number }>(DATA_URL(), AoriDataMethods.GetSeatDetails, [{ seatId }])
        .then(({ seatId, seatOwner, seatScore }) => ({ seatId, seatOwner, seatScore }));
}

export function verifySignature(message: string, signature: string): string {
    return verifyMessage(message, signature);
}

export function sendTransaction(signedTx: string): Promise<string> {
    return rawCall(DATA_URL(), AoriDataMethods.SendTransaction, [{ signedTx }]);
}

export function simulateTransaction(signedTx: string): Promise<string> {
    return rawCall(DATA_URL(), AoriDataMethods.SimulateTransaction, [{ signedTx }]);
}

export function staticCall({ chainId, to, data }: { chainId: number; to: string; data: string }): Promise<string> {
    return rawCall<{ response: string }>(DATA_URL(), AoriDataMethods.StaticCall, [{ chainId, to, data }])
        .then(({ response }) => response);
}

export function computeCREATE3Address(deployer: string, saltPhrase: string, create3address: string = CREATE3FACTORY_DEPLOYED_ADDRESS): Promise<string> {
    return rawCall<{ computedAddress: string }>(DATA_URL(), AoriDataMethods.Create3Address, [{ deployer, salt: id(saltPhrase), create3address }])
        .then(({ computedAddress }) => computedAddress);
}

export function isContract(chainId: number, address: string): Promise<boolean> {
    return rawCall<{ isContract: boolean }>(DATA_URL(), AoriDataMethods.IsContract, [{ chainId, address }])
        .then(({ isContract }) => isContract);
}