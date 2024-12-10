import { getBytes, JsonRpcError, JsonRpcResult, solidityPackedKeccak256, TransactionRequest, verifyMessage, Wallet } from "ethers";
import { getFeeData, getNonce, getTokenDetails, sendTransaction, simulateTransaction } from "../providers";
import { ERC20__factory } from "../types";
import { approve } from "../utils";
import axios from "axios";

/*//////////////////////////////////////////////////////////////
                        RPC RESPONSE
//////////////////////////////////////////////////////////////*/

export function toRpcResponse<T = any>(id: number | null, result: T): JsonRpcResult {
    return {
        id,
        result
    } as JsonRpcResult
}

export function toRpcError(id: number, error: string | JsonRpcError["error"]): JsonRpcError {
    return {
        id,
        error: typeof error === "string" ? { code: -32603, message: error } : error
    }
}

export { JsonRpcError, JsonRpcPayload, JsonRpcResult, Wallet, ZeroAddress } from "ethers";

export async function rawCall<T>(url: string, method: string, params: [any] | [] ): Promise<T> {
    const { data: axiosResponseData }: { data: JsonRpcResult | JsonRpcError } = await axios.post(url, {
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

/*//////////////////////////////////////////////////////////////
                        MISC. SIGNATURE
//////////////////////////////////////////////////////////////*/

export function signAddressSync(wallet: Wallet, address: string) {
    return wallet.signMessageSync(getBytes(address));
}
/*//////////////////////////////////////////////////////////////
                            WALLET
//////////////////////////////////////////////////////////////*/

export async function checkAndApproveToken(
    wallet: Wallet,
    chainId: number,
    token: string,
    spender: string,
    amount: bigint
) {
    const { allowance } = await getTokenDetails(chainId, token, wallet.address, spender);
    if (allowance != undefined && allowance < amount) { 
        await sendOrRetryTransaction(wallet,
            { ...approve(token, spender, amount.toString(), chainId), gasLimit: 1_000_000 },
            { retries: 3 }
        );
    }
}

export async function sendOrRetryTransaction(wallet: Wallet, tx: TransactionRequest & { chainId: number }, { retries, gasPriceMultiplier }: { retries?: number, gasPriceMultiplier?: number } = { retries: 3 }) {  
    const _retries = retries || 3;
    const _gasPriceMultiplier = gasPriceMultiplier || 1.1;

    let attempts = 0;
    let success = false;

    while (attempts < _retries && !success) {

        try {
            const nonce = await getNonce(tx.chainId, wallet.address);
            const { gasPrice, maxFeePerGas, maxPriorityFeePerGas } = await getFeeData(tx.chainId);
            if (retries != 0) await simulateTransaction({ ...tx, from: wallet.address });

            const signedTx = await wallet.signTransaction({
                ...tx,
                nonce,
                gasPrice: Math.round(Number(gasPrice) * _gasPriceMultiplier),
                ...(maxFeePerGas != null ? { maxFeePerGas, maxPriorityFeePerGas } : { gasLimit: 3_000_000n })
            });
            await sendTransaction(signedTx);
            success = true;
        } catch (e: any) {
            // TODO: standardise common error messages and handle them here
            if (e.toString().includes("Maker order has been settled")) success = true;
            console.log(e);
        }

        attempts++;
    }

    return success;
}