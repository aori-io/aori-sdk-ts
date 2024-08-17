import axios from "axios";
import { BytesLike, Contract, id, Interface, JsonRpcError, JsonRpcProvider, JsonRpcResult, TransactionRequest, verifyMessage } from "ethers";
import { AORI_DATA_PROVIDER_APIS, CREATE3FACTORY_DEPLOYED_ADDRESS, getDefaultZone, rawCall } from "../utils";
import { AoriDataMethods, AoriMethods } from "../utils/interfaces";
import { AoriV2__factory, CREATE3Factory__factory, ERC20__factory } from "../types";

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

function DATA_URL() {
    return AORI_DATA_PROVIDER_APIS[Math.floor(Math.random() * AORI_DATA_PROVIDER_APIS.length)]
}

export function getNonce(provider: JsonRpcProvider, address: string) { return provider.getTransactionCount(address, "pending"); }
export function getFeeData(provider: JsonRpcProvider) { return provider.getFeeData(); }
export function estimateGas(provider: JsonRpcProvider, tx: TransactionRequest) { return provider.estimateGas(tx); }

export function hasOrderSettled(provider: JsonRpcProvider, orderHash: string, zone?: string) {
    const contract = AoriV2__factory.connect(getDefaultZone(Number(provider._network.chainId)), provider);
    return contract.hasOrderSettled(orderHash);
}

export function getNativeBalance(provider: JsonRpcProvider, address: string) { return provider.getBalance(address); }
export async function getTokenBalance(provider: JsonRpcProvider, address: string, token: string) {
    const contract = ERC20__factory.connect(token, provider);
    return await contract.balanceOf(address);
}

export async function getTokenAllowance(provider: JsonRpcProvider, address: string, token: string, spender: string) {
    const contract = ERC20__factory.connect(token, provider);
    return await contract.allowance(address, spender);

}

export async function getTokenDetails(provider: JsonRpcProvider, token: string) {
    const contract = ERC20__factory.connect(token, provider); 
    return {
        name: await contract.name(),
        symbol: await contract.symbol(),
        decimals: await contract.decimals()
    }
}

export function isValidSignature(chainId: number, address: string, hash: BytesLike, signature: string): Promise<boolean> {
    return rawCall<{ isValidSignature: boolean }>(DATA_URL(), AoriDataMethods.IsValidSignature, [{ chainId, vault: address, hash: hash.toString(), signature }])
        .then(({ isValidSignature }) => isValidSignature);
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

export function computeCREATE3Address(provider: JsonRpcProvider, deployer: string, saltPhrase: string, create3address: string = CREATE3FACTORY_DEPLOYED_ADDRESS) {
    return CREATE3Factory__factory.connect(create3address, provider).getDeployed(deployer, saltPhrase);
}

export async function isContract(provider: JsonRpcProvider, address: string) {
    return await provider.getCode(address) != "0x";
}