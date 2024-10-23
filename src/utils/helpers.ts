import { AbiCoder, getBytes, getAddress, id, JsonRpcError, JsonRpcResult, solidityPacked, solidityPackedKeccak256, TransactionRequest, verifyMessage, Wallet, JsonRpcProvider, ContractFactory, keccak256 } from "ethers";
import { getFeeData, getNonce, getTokenDetails, isValidSignature, sendTransaction, simulateTransaction } from "../providers";
import { AoriV2__factory, ERC20__factory } from "../types";
import { InstructionStruct } from "../types/AoriVault";
import { AoriMatchingDetails, AoriOrder } from "../utils";
import { AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES, SUPPORTED_AORI_CHAINS } from "./constants";
import { CreateLimitOrderParams, DetailsToExecute } from "./interfaces";
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
                            ZONE
//////////////////////////////////////////////////////////////*/

export function getDefaultZone(chainId: number) {
    const zoneOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zoneOnChain) throw new Error(`Chain ${chainId} is not supported yet!`);
    return zoneOnChain;
}

export function isZoneSupported(chainId: number, address: string) {
    const zoneOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zoneOnChain) return false;
    return zoneOnChain.toLowerCase() == address.toLowerCase();
}

/*//////////////////////////////////////////////////////////////
                             FEE
//////////////////////////////////////////////////////////////*/

export const BIPS_DENOMINATOR = 10_000n;

export function withFee(amount: bigint, feeInBips: bigint) {
    return amount * (BIPS_DENOMINATOR + feeInBips) / BIPS_DENOMINATOR;
}

export function withoutFee(amount: bigint, feeInBips: bigint) {
    return amount * BIPS_DENOMINATOR / (BIPS_DENOMINATOR + feeInBips);
}

/*//////////////////////////////////////////////////////////////
                    ORDER HELPER FUNCTIONS
//////////////////////////////////////////////////////////////*/

export async function formatIntoLimitOrder({
    offerer,
    startTime = Math.floor((Date.now() - 10 * 60 * 1000) / 1000), // Start 10 minutes in the past
    endTime = Math.floor((Date.now() + 10 * 60 * 1000) / 1000), // End 10 minutes in the future 
    inputToken,
    inputAmount,
    chainId = 1,
    zone = getDefaultZone(chainId),
    outputToken,
    outputAmount,
    toWithdraw = true
}: CreateLimitOrderParams): Promise<AoriOrder> {

    return {
        offerer,
        inputToken,
        inputAmount: inputAmount.toString(),
        outputToken,
        outputAmount: outputAmount.toString(),
        recipient: offerer,
        zone,
        chainId,
        startTime: `${startTime}`,
        endTime: `${endTime}`,
        toWithdraw
    }
}

export const createLimitOrder = formatIntoLimitOrder;
export const newLimitOrder = formatIntoLimitOrder;

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

export function signOrderSync(wallet: Wallet, order: AoriOrder) {
    const orderHash = getOrderHash(order);
    return signOrderHashSync(wallet, orderHash);
}
export const signOrder = signOrderSync;

export function signOrderHashSync(wallet: Wallet, orderHash: string) {
    return wallet.signMessageSync(getBytes(orderHash));
}

export async function createAndSignResponse(wallet: Wallet, orderParams: Parameters<typeof createLimitOrder>[0]): Promise<{ order: AoriOrder, orderHash: string, signature: string }> {
    const order = await createLimitOrder(orderParams);
    const orderHash = getOrderHash(order);
    const signature = signOrderSync(wallet, order);
    return { order, orderHash, signature };
}

export function getOrderSigner(order: AoriOrder, signature: string) {
    return verifyMessage(getBytes(getOrderHash(order)), signature);
}

export async function validateOrder(order: AoriOrder, signature: string): Promise<string | null> {

    // Check if chain is supported
    if (!SUPPORTED_AORI_CHAINS.has(order.chainId)) return `Chain ${order.chainId} not supported`;

    if (signature == undefined || signature == "" || signature == null) return "No signature provided";

    if (!isZoneSupported(order.chainId, order.zone)) return `Zone ${order.zone} on ${order.chainId} not supported`;

    if (BigInt(order.startTime) > BigInt(order.endTime)) return `Start time (${order.startTime}) cannot be after end (${order.endTime}) time`;
    if (BigInt(order.endTime) < BigInt(Math.floor(Date.now() / 1000))) return `End time (${order.endTime}) cannot be in the past`;

    // Verify that the signature of the taker order is valid
    let orderMessageSigner;
    try {
        orderMessageSigner = getOrderSigner(order, signature);
    } catch (e: any) {
        return `Signature signer could not be retrieved: ${e.message}`;
    }

    try {
        // make isValidSignature call too
        if (orderMessageSigner.toLowerCase() !== order.offerer.toLowerCase()) {
            if (!(await isValidSignature(order.chainId, order.offerer, getOrderHash(order), signature))) {
                return `Signature (${signature}) appears to be invalid via calling isValidSignature on ${order.offerer} on chain ${order.chainId} - order hash: ${getOrderHash(order)}`
            }
        }
    } catch (e: any) {
        return `isValidSignature call failed: ${e.message}`;
    }

    return null;
}

export function validateMakerOrderMatchesTakerOrder(makerOrder: AoriOrder, takerOrder: AoriOrder, feeInBips: bigint = 0n): string | null {

    if (takerOrder.chainId != makerOrder.chainId) return `Taker order is on chain ${takerOrder.chainId} but maker order is on chain ${makerOrder.chainId}`;
    if (takerOrder.zone.toLowerCase() != makerOrder.zone.toLowerCase()) return `Taker order is on zone ${takerOrder.zone} but maker order is on zone ${makerOrder.zone}`;

    // Verify that the takerOrder and the makerOrder use the same token
    if (takerOrder.inputToken.toLowerCase() != makerOrder.outputToken.toLowerCase()) return `Taker order is on token ${takerOrder.inputToken} but maker order is on token ${makerOrder.outputToken}`;
    if (takerOrder.outputToken.toLowerCase() != makerOrder.inputToken.toLowerCase()) return `Taker order is on token ${takerOrder.outputToken} but maker order is on token ${makerOrder.inputToken}`;

    // Check that the maker and taker orders have enough inputAmounts
    if (BigInt(takerOrder.inputAmount) < withFee(BigInt(makerOrder.outputAmount), feeInBips)) return `Taker order has insufficient input amount to meet maker order's output amount`;
    if (BigInt(makerOrder.inputAmount) < BigInt(takerOrder.outputAmount)) return `Maker order has insufficient input amount to meet taker order's output amount`;

    return null;
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
    feeRecipient
}: AoriMatchingDetails, signature: string, hookData: string = "0x") {
    return AoriV2__factory.createInterface().encodeFunctionData("settleOrders", [{
        tradeId,
        makerOrder,
        takerOrder,
        makerSignature,
        takerSignature,
        feeTag,
        feeRecipient
    }, signature, hookData]);
}

export function toDetailsToExecute(
    matching: AoriMatchingDetails,
    matchingSignature: string,
    to: string,
    value: number,
    data: string,
    takerPermitSignature?: string
): DetailsToExecute {
    return {
        matching,
        matchingSignature,

        chainId: matching.takerOrder.chainId,
        zone: matching.takerOrder.zone,

        to,
        value,
        data,

        takerPermitSignature, // In case the taker would like to make use of a gasless permit
    }
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
            const signedTx = await wallet.signTransaction({
                ...tx,
                nonce,
                gasPrice: Math.round(Number(gasPrice) * _gasPriceMultiplier),
                ...(maxFeePerGas != null ? { maxFeePerGas, maxPriorityFeePerGas } : { gasLimit: 8_000_000n })
            });

            // On last try, just send the transaction
            if (retries != 0) await simulateTransaction(signedTx);
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

export async function settleOrdersViaVault(wallet: Wallet, detailsToExecute: DetailsToExecute, {
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
        data: calldataToSettleOrders(
            detailsToExecute.matching,
            detailsToExecute.matchingSignature,
            encodeInstructions(
                preSwapInstructions,
                postSwapInstructions
            )
        ),
        gasLimit: gasLimit,
        chainId: detailsToExecute.chainId
    }, {
        gasPriceMultiplier
    });
}