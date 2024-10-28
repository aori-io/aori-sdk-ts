import { BytesLike, Interface, JsonRpcProvider, TransactionRequest, verifyMessage, ZeroAddress } from "ethers";
import { AORI_DATA_PROVIDER_API, AORI_SETTLEMENT_PROVIDER_API, rawCall, SEATS_NFT_ADDRESS } from "../utils";
import { AoriV2__factory, AoriVault__factory, ERC20__factory } from "../types";
import { AoriDataMethods } from "../utils/interfaces";
import { getChainProvider } from "../utils/providers";
import axios from "axios";

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

function resolveProvider(chainIdOrProvider: number | JsonRpcProvider): JsonRpcProvider {
    if (typeof chainIdOrProvider == "number") return getChainProvider(chainIdOrProvider);
    return chainIdOrProvider;
}

export function retryIfFail<T>(provider: JsonRpcProvider, fn: (provider: JsonRpcProvider) => Promise<T>, retries = 3, loadCount = 1): Promise<T> {
    const arr: Promise<any>[] = [];
    for (let i = 0; i < loadCount; i++) arr.push(new Promise(async (resolve, reject) => {
        try {
            const requestId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const url = provider._getConnection().url;
            console.time(`RPC Call ${requestId} - ${url}`);
            const response = await fn(provider);
            console.timeEnd(`RPC Call ${requestId} - ${url}`);
            return resolve(response);
        } catch (e) {
            return reject(e);
        }
    }));

    return Promise.any(arr).catch((e) => {
        console.log(`Getting error...`);
        console.log(e);
        throw e.errors[0];
    }).catch((e) => {
        if (retries > 0) {
            console.log(`Retrying RPC call ${4 - retries}`);
            return retryIfFail(provider, fn, retries - 1);
        } else {
            console.log(`Failed retries with RPC call`);
        }
        throw e;
    });
}

/*//////////////////////////////////////////////////////////////
                                 CALLS
//////////////////////////////////////////////////////////////*/

export function getBlockNumber(chainIdOrProvider: number | JsonRpcProvider) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getBlockNumber());
}

export function getNonce(chainIdOrProvider: number | JsonRpcProvider, address: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getTransactionCount(address, "pending"));
}

export function getFeeData(chainIdOrProvider: number | JsonRpcProvider) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getFeeData());
}

export function estimateGas(chainIdOrProvider: number | JsonRpcProvider, tx: TransactionRequest) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.estimateGas(tx));
}

export function hasOrderSettled(chainIdOrProvider: number | JsonRpcProvider, orderHash: string, zone: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => {
        const contract = AoriV2__factory.connect(zone, provider);
        return contract.hasOrderSettled(orderHash);
    });
}

export function getNativeBalance(chainIdOrProvider: number | JsonRpcProvider, address: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getBalance(address));
}

export async function getTokenDetails(chainIdOrProvider: number | JsonRpcProvider, token: string, address?: string, spender?: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), async (provider) => {
        const contract = ERC20__factory.connect(token, provider); 
        return {
            name: await contract.name(),
            symbol: await contract.symbol(),
            decimals: await contract.decimals(),
            ...(address ?  { balance: await contract.balanceOf(address) } : {}),
            ...((address && spender) ? { allowance: await contract.allowance(address, spender) } : {})
        }
    })
}

export async function isValidSignature(chainIdOrProvider: number | JsonRpcProvider, address: string, hash: BytesLike, signature: string): Promise<boolean> {
    return retryIfFail(resolveProvider(chainIdOrProvider), async (provider) => {
        const contract = AoriVault__factory.connect(address, provider);
        return await contract.isValidSignature(hash, signature) == "0x1626ba7e";
    });   
}

export async function getSeatDetails(chainIdOrProvider: number | JsonRpcProvider, seatId: number): Promise<{ seatOwner: string, seatScore: number }> {
    return retryIfFail(resolveProvider(chainIdOrProvider), async (provider) => {
        const i = new Interface(["function getSeatScore(uint256 _seatId) external view returns (uint256)", "function ownerOf(uint256 _seatId) external view returns (address)"]);
        const owner = await staticCall(provider, {
            to: SEATS_NFT_ADDRESS,
            data: i.encodeFunctionData("ownerOf", [seatId])
        });

        const seatScore = await staticCall(provider, {
            to: SEATS_NFT_ADDRESS,
            data: i.encodeFunctionData("getSeatScore", [seatId])
        });

        return {
            seatOwner: owner,
            seatScore: parseInt(seatScore) || 0
        }
    });    
}

export function verifySignature(message: string, signature: string): string {
    return verifyMessage(message, signature);
}

export function sendTransaction(signedTx: string): Promise<string> {
    return rawCall(AORI_DATA_PROVIDER_API, AoriDataMethods.SendTransaction, [{ signedTx }]);
}

export function simulateTransaction(signedTx: string): Promise<string> {
    return rawCall(AORI_DATA_PROVIDER_API, AoriDataMethods.SimulateTransaction, [{ signedTx }]);
}

export function staticCall(chainIdOrProvider: number | JsonRpcProvider, tx: TransactionRequest) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.call(tx));
}

export async function isContract(chainIdOrProvider: number | JsonRpcProvider, address: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getCode(address).then(code => code != "0x"))
}

export async function getSettlementStatus(orderHashes: string[]): Promise<{ [orderHash: string]: { settled: true, transactionHash: string, maker: string, taker: string } | { settled: false } }> {
    const { data }: { data: { [orderHash: string]: {
        settled: true,
        transactionHash: string,
        maker: string,
        taker: string
    } | { settled: false } } } = await axios.post(AORI_SETTLEMENT_PROVIDER_API, {
        orderHashes
    });

    return data;
}