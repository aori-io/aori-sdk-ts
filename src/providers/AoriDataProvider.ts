import axios from "axios";
import { BytesLike, id, JsonRpcError, JsonRpcResult, verifyMessage } from "ethers";
import { AORI_DATA_PROVIDER_APIS, CREATE3FACTORY_DEPLOYED_ADDRESS } from "../utils";
import { AoriDataMethods, AoriMethods } from "../utils/interfaces";

export class AoriDataProvider {
    urls: string[];

    constructor() {
        this.urls = AORI_DATA_PROVIDER_APIS;
    }

    async getBlockNumber({
        chainId
    }: {
        chainId: number
    }): Promise<number> {
        const { blockNumber } = await this.rawCall({
            method: AoriDataMethods.GetBlockNumber,
            params: [{ chainId }]
        })
        return blockNumber;
    }

    async getNonce({
        chainId,
        address
    }: {
        chainId: number;
        address: string;
    }): Promise<number> {
        const { nonce } = await this.rawCall({
            method: AoriDataMethods.GetNonce,
            params: [{ address, chainId }]
        });
        return nonce;
    }

    async getSeaportCounter({
        chainId,
        address
    }: {
        chainId: number;
        address: string;
    }): Promise<number> {
        const { counter } = await this.rawCall({
            method: AoriDataMethods.GetSeaportCounter,
            params: [{ address, chainId }]
        });
        return counter;
    }

    async getSeatDetails({
        seatId
    }: {
        seatId: number
    }): Promise<{ seatId: number, seatOwner: string, seatScore: number }> {
        const data = await this.rawCall({
            method: AoriDataMethods.GetSeatDetails,
            params: [{ seatId }]
        });
        return data;
    }

    async getCounter({
        chainId,
        zone,
        address
    }: {
        chainId: number,
        zone: string,
        address: string
    }): Promise<number> {
        const { counter } = await this.rawCall({
            method: AoriDataMethods.GetAoriCounter,
            params: [{ chainId, zone, address }]
        });
        return counter;
    }

    async getTokenAllowance({
        chainId,
        address,
        spender,
        token
    }: {
        chainId: number;
        address: string;
        spender: string;
        token: string;
    }): Promise<bigint> {
        const { tokenAllowance } = await this.rawCall({
            method: AoriDataMethods.GetTokenAllowance,
            params: [{ address, chainId, token, spender }]
        });
        return BigInt(tokenAllowance);
    }

    async getTokenBalance({
        chainId,
        address,
        token
    }: {
        chainId: number;
        address: string;
        token: string;
    }): Promise<bigint> {
        const { tokenBalance } = await this.rawCall({
            method: AoriDataMethods.GetTokenBalance,
            params: [{ address, chainId, token }]
        });
        return BigInt(tokenBalance);
    }

    async getTokenDetails({
        chainId,
        token
    }: {
        chainId: number;
        token: string;
    }): Promise<{ name: string, symbol: string, decimals: number }> {
        const { name, symbol, decimals } = await this.rawCall({
            method: AoriDataMethods.GetTokenDetails,
            params: [{ chainId, token }]
        });
        return { name, symbol, decimals };
    }

    async getNativeBalance({
        chainId,
        address
    }: {
        chainId: number;
        address: string;
    }): Promise<bigint> {
        const { nativeBalance } = await this.rawCall({
            method: AoriDataMethods.GetNativeBalance,
            params: [{ address, chainId }]
        });
        return BigInt(nativeBalance);
    }

    async hasOrderSettled({
        chainId,
        orderHash,
        zone
    }: {
        chainId: number;
        orderHash: string;
        zone?: string;
    }): Promise<boolean> {
        const { orderSettled } = await this.rawCall({
            method: AoriDataMethods.HasOrderSettled,
            params: [{ chainId, orderHash, zone }]
        });
        return orderSettled;
    }

    async isValidSignature({
        chainId,
        vault,
        hash,
        signature
    }: {
        chainId: number;
        vault: string;
        hash: string;
        signature: string;
    }): Promise<boolean> {
        const { isValidSignature } = await this.rawCall({
            method: AoriDataMethods.IsValidSignature,
            params: [{ chainId, vault, hash, signature }]
        });
        return isValidSignature;
    }

    async estimateGas({
        chainId,
        to,
        value,
        data: _data,
        from
    }: {
        chainId: number;
        to: string;
        value: number;
        data: string;
        from?: string
    }): Promise<string> {
        const { gasData } = await this.rawCall({
            method: AoriDataMethods.EstimateGas,
            params: [{ chainId, to, value, data: _data, from }]
        });

        return gasData;
    }

    async getFeeData({
        chainId
    }: { chainId: number }): Promise<{
        gasPrice: string,
        maxFeePerGas: string,
        maxPriorityFeePerGas: string,
    }> {
        const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await this.rawCall({
            method: AoriDataMethods.GetFeeData,
            params: [{ chainId }]
        })

        return { gasPrice, maxFeePerGas, maxPriorityFeePerGas };
    }

    async sendTransaction({
        signedTx
    }: {
        signedTx: string
    }) {
        const data = await this.rawCall({
            method: AoriDataMethods.SendTransaction,
            params: [{ signedTx }]
        });
        return data;
    }

    async simulateTransaction({
        signedTx
    }: {
        signedTx: string
    }) {
        const data = await this.rawCall({
            method: AoriDataMethods.SimulateTransaction,
            params: [{ signedTx }]
        });
        return data;
    }

    async staticCall({
        to,
        data,
        chainId
    }: {
        to: string;
        data: string,
        chainId: number
    }): Promise<string> {
        const { response } = await this.rawCall({
            method: AoriDataMethods.StaticCall,
            params: [{ to, data, chainId }]
        });
        return response;
    }

    async isContract({
        chainId,
        address
    }: {
        chainId: number;
        address: string
    }): Promise<boolean> {
        const { isContract } = await this.rawCall({
            method: AoriDataMethods.IsContract,
            params: [{ chainId, address }]
        });
        return isContract;
    }

    async computeCREATE3Address({
        deployer,
        salt,
        create3address = CREATE3FACTORY_DEPLOYED_ADDRESS
    }: {
        deployer: string;
        salt: string,
        create3address?: string
    }): Promise<string> {
        const { computedAddress } = await this.rawCall({
            method: AoriDataMethods.Create3Address,
            params: [{ create3address, deployer, salt }]
        });
        return computedAddress;
    }

    async rawCall<T>({
        method,
        params
    }: {
        method: AoriMethods | string,
        params: [T] | []
    }) {
        const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(
            // Pick randomly from AORI_DATA_PROVIDER_APIS
            this.urls[Math.floor(Math.random() * this.urls.length)],
            {
                id: 1,
                jsonrpc: "2.0",
                method,
                params
            });

        if ("error" in axiosResponseData) {
            throw new Error(axiosResponseData.error.message);
        }

        const { result: data } = axiosResponseData;
        return data;
    }
}

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

const dataProvider = new AoriDataProvider();

export function _setDataProviderURLs(urls: string[]) {
    dataProvider.urls = urls;
}

export function getBlockNumber(chainId: number) { return dataProvider.getBlockNumber({ chainId }) }

export function getNonce(chainId: number, address: string): Promise<number> {
    return dataProvider.getNonce({ chainId, address });
}

export function getFeeData(chainId: number): Promise<{
    gasPrice: string,
    maxFeePerGas: string | null,
    maxPriorityFeePerGas: string | null,
}> {
    return dataProvider.getFeeData({ chainId });
}

export function estimateGas({
    chainId,
    to,
    value,
    data: _data,
    from
}: {
    chainId: number;
    to: string;
    value: number;
    data: string;
    from?: string
}): Promise<string> {
    return dataProvider.estimateGas({ chainId, to, value, data: _data, from });
}

export function isValidSignature(chainId: number, address: string, hash: BytesLike, signature: string): Promise<boolean> {
    return dataProvider.isValidSignature({ chainId, vault: address, hash: hash.toString(), signature });
}

export function hasOrderSettled(chainId: number, orderHash: string, zone?: string): Promise<boolean> {
    return dataProvider.hasOrderSettled({ chainId, orderHash, zone });
}

export function getAoriCounter(chainId: number, zone: string, address: string): Promise<number> {
    return dataProvider.getCounter({ chainId, zone, address });
}

export function getNativeBalance(chainId: number, address: string): Promise<bigint> {
    return dataProvider.getNativeBalance({ chainId, address });
}

export function getTokenBalance(chainId: number, address: string, token: string): Promise<bigint> {
    return dataProvider.getTokenBalance({ chainId, address, token });
}

export function getTokenAllowance(chainId: number, address: string, token: string, spender: string): Promise<bigint> {
    return dataProvider.getTokenAllowance({ chainId, address, token, spender });
}

export function getTokenDetails(chainId: number, token: string): Promise<{ name: string, symbol: string, decimals: number }> {
    return dataProvider.getTokenDetails({ chainId, token });
}

export function getSeatDetails(seatId: number): Promise<{ seatOwner: string, seatScore: number }> {
    return dataProvider.getSeatDetails({ seatId });
}

export function verifySignature(message: string, signature: string): string {
    return verifyMessage(message, signature);
}

export function sendTransaction(signedTx: string): Promise<string> {
    return dataProvider.sendTransaction({ signedTx });
}

export function simulateTransaction(signedTx: string): Promise<string> {
    return dataProvider.simulateTransaction({ signedTx });
}

export function staticCall({
    chainId,
    to,
    data
}: {
    chainId: number;
    to: string;
    data: string
}): Promise<string> {
    return dataProvider.staticCall({ chainId, to, data });
}

export function computeCREATE3Address(deployer: string, saltPhrase: string, create3address: string = CREATE3FACTORY_DEPLOYED_ADDRESS): Promise<string> {
    return dataProvider.computeCREATE3Address({ deployer, salt: id(saltPhrase), create3address });
}

export function isContract(chainId: number, address: string): Promise<boolean> {
    return dataProvider.isContract({ chainId, address });
}