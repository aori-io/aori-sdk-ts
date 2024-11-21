import { AbiCoder, getBytes, getAddress, id, JsonRpcError, JsonRpcResult, solidityPacked, solidityPackedKeccak256, TransactionRequest, verifyMessage, Wallet, JsonRpcProvider, ContractFactory, keccak256 } from "ethers";
import { createLimitOrder, getFeeData, getNonce, getTokenDetails, isValidSignature, sendTransaction, simulateTransaction } from "../providers";
import { AoriV2__factory, ERC20__factory } from "../types";
import { InstructionStruct } from "../types/AoriVault";
import { AoriMatchingDetails, AoriOrder, getChainProvider } from "../utils";
import { AORI_DEFAULT_FEE_IN_BIPS, AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES, getAmountMinusFee, SUPPORTED_AORI_CHAINS } from "./constants";
import { AoriOrderWithOptionalOutputAmount, CreateLimitOrderParams, DetailsToExecute } from "./interfaces";
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
                    MATCHING HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export function getMatchingHash({
    tradeId,
    makerSignature,
    takerSignature,
    feeTag,
    feeRecipient
}: AoriMatchingDetails): string {
    return solidityPackedKeccak256([
        "string",
        "bytes",
        "bytes",
        "string",
        "address",
    ], [
        tradeId,
        makerSignature,
        takerSignature,
        feeTag,
        feeRecipient
    ])
}

export function signMatchingSync(wallet: Wallet, matching: AoriMatchingDetails) {
    const matchingHash = getMatchingHash(matching);
    return wallet.signMessageSync(getBytes(matchingHash));
}

export function getMatchingSigner(matching: AoriMatchingDetails, signature: string) {
    return verifyMessage(getMatchingHash(matching), signature);
}

export function calldataToSettleOrders({
    tradeId,
    makerOrder,
    takerOrder,
    makerSignature,
    takerSignature,
    feeTag,
    feeRecipient,
    serverSignature,
    hookData = "0x"
}: AoriMatchingDetails & {
    makerOrder: AoriOrder,
    takerOrder: AoriOrder,
    serverSignature: string,
    hookData?: string
}) {
    return AoriV2__factory.createInterface().encodeFunctionData("settleOrders", [{
        tradeId,
        makerOrder,
        takerOrder,
        makerSignature,
        takerSignature,
        feeTag,
        feeRecipient
    }, serverSignature, hookData]);
}

const InstructionTypeABI = {
    "components": [
        {
            "internalType": "address",
            "name": "to",
            "type": "address"
        },
        {
            "internalType": "uint256",
            "name": "value",
            "type": "uint256"
        },
        {
            "internalType": "bytes",
            "name": "data",
            "type": "bytes"
        }
    ],
    "internalType": "struct Instruction[]",
    "name": "instructions",
    "type": "tuple[]"
}

export function encodeInstructions(
    preSwapInstructions: InstructionStruct[],
    postSwapInstructions: InstructionStruct[]
) {
    return AbiCoder.defaultAbiCoder().encode(
        // @ts-ignore
        [InstructionTypeABI, InstructionTypeABI],
        [preSwapInstructions, postSwapInstructions]
    )
}

export function encodePreSwapInstructions(preSwapInstructions: InstructionStruct[]) {
    return AbiCoder.defaultAbiCoder().encode(
        // @ts-ignore
        [InstructionTypeABI, InstructionTypeABI],
        [preSwapInstructions, []]
    )
}

export function encodePostSwapCalldata(postSwapInstructions: InstructionStruct[]) {
    return AbiCoder.defaultAbiCoder().encode(
        // @ts-ignore
        [InstructionTypeABI, InstructionTypeABI],
        [[], postSwapInstructions]
    )
}

export function decodeInstructions(encoded: string) {
    return AbiCoder.defaultAbiCoder().decode(
        // @ts-ignore
        [InstructionTypeABI, InstructionTypeABI],
        encoded
    )
}

/*//////////////////////////////////////////////////////////////
                            WALLET
//////////////////////////////////////////////////////////////*/

export function approveTokenCall(
    token: string,
    spender: string,
    amount: bigint
) {
    return {
        to: token,
        value: 0,
        data: ERC20__factory.createInterface().encodeFunctionData("approve", [spender, amount]),
    }
}

export async function approveToken(
    wallet: Wallet,
    chainId: number,
    token: string,
    spender: string,
    amount: bigint
) {
    return sendOrRetryTransaction(wallet, {
        ...approveTokenCall(token, spender, amount),
        chainId,
        gasLimit: 1_000_000,
    });
}

export async function checkAndApproveToken(
    wallet: Wallet,
    chainId: number,
    token: string,
    spender: string,
    amount: bigint
) {
    const { allowance } = await getTokenDetails(chainId, token, wallet.address, spender);
    if (allowance != undefined && allowance < amount) { 
        await approveToken(wallet, chainId, token, spender, amount);
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


export async function settleOrders(wallet: Wallet, detailsToExecute: DetailsToExecute, { gasLimit, gasPriceMultiplier }: { gasLimit?: bigint, gasPriceMultiplier?: number } = { gasLimit: 2_000_000n }) {
    return await sendOrRetryTransaction(wallet, {
        to: detailsToExecute.to,
        value: detailsToExecute.value,
        data: detailsToExecute.data,
        gasLimit: gasLimit,
        chainId: detailsToExecute.chainId
    }, {
        gasPriceMultiplier
    });
}

export async function settleOrdersViaVault(wallet: Wallet, detailsToExecute: DetailsToExecute & { makerOrder: AoriOrder, takerOrder: AoriOrder }, {
    gasPriceMultiplier,
    gasLimit = 2_000_000n,
    preSwapInstructions = [],
    postSwapInstructions = []
}: {
    gasPriceMultiplier?: number,
    gasLimit?: bigint,
    preSwapInstructions?: InstructionStruct[],
    postSwapInstructions?: InstructionStruct[]
}) {
    return await sendOrRetryTransaction(wallet, {
        to: detailsToExecute.to,
        value: detailsToExecute.value,
        data: calldataToSettleOrders({
            makerOrder: detailsToExecute.makerOrder,
            takerOrder: detailsToExecute.takerOrder,
            ...detailsToExecute.matching,
            serverSignature: detailsToExecute.matchingSignature,
            hookData: encodeInstructions(
                preSwapInstructions,
                postSwapInstructions
            )
        }),
        gasLimit: gasLimit,
        chainId: detailsToExecute.chainId
    }, {
        gasPriceMultiplier
    });
}