import { AbiCoder, getBytes, getAddress, id, JsonRpcError, JsonRpcResult, solidityPacked, solidityPackedKeccak256, TransactionRequest, verifyMessage, Wallet, JsonRpcProvider } from "ethers";
import { computeCREATE3Address, getFeeData, getNonce, getTokenDetails, isValidSignature, sendTransaction, simulateTransaction } from "../providers";
import { AoriV2__factory, AoriVault__factory, AoriVaultBlast__factory, CREATE3Factory__factory, ERC20__factory } from "../types";
import { InstructionStruct } from "../types/AoriVault";
import { AoriMatchingDetails, AoriOrder } from "../utils";
import { AORI_DATA_PROVIDER_API, AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES, ChainId, CREATE3FACTORY_DEPLOYED_ADDRESS, SUPPORTED_AORI_CHAINS } from "./constants";
import { CreateLimitOrderParams, DetailsToExecute } from "./interfaces";
import axios from "axios";
import { getChainProvider } from "./providers";
import { IAoriV2 } from "../types/AoriV2";

/*//////////////////////////////////////////////////////////////
                        RPC RESPONSE
//////////////////////////////////////////////////////////////*/

export function toRpcResponse<T = any>(id: number | null, result: T): JsonRpcResult {
    return {
        id,
        result
    } as JsonRpcResult
}

export function toRpcError(id: number, error: JsonRpcError["error"]): JsonRpcError {
    return {
        id,
        error
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
                            ZONE
//////////////////////////////////////////////////////////////*/

export function getDefaultZone(chainId: number) {
    const zonesOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zonesOnChain) {
        throw new Error(`Chain ${chainId} is not supported yet!`);
    }
    return [...zonesOnChain][0];
}

export function isZoneSupported(chainId: number, address: string) {
    const zonesOnChain = AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.get(chainId);
    if (!zonesOnChain) return false;
    return zonesOnChain.has(address.toLowerCase());
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
        // Input
        "address", // inputToken
        "uint256", // inputAmount
        // Output
        "address", // outputToken
        "uint256", // outputAmount
        "address", // recipient
        "address", // zone
        "uint256", // chainId
        // Other details
        "uint256", // startTime
        "uint256", // endTime
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

    // TODO: reconsider this
    if (order.inputAmount == "0") return `Input amount cannot be zero`;
    if (order.outputAmount == "0") return `Output amount cannot be zero`;

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

export function validateMakerOrderMatchesTakerOrder(makerOrder: AoriOrder, takerOrder: AoriOrder): string | null {

    if (takerOrder.chainId != makerOrder.chainId) return `Taker order is on chain ${takerOrder.chainId} but maker order is on chain ${makerOrder.chainId}`;
    if (takerOrder.zone.toLowerCase() != makerOrder.zone.toLowerCase()) return `Taker order is on zone ${takerOrder.zone} but maker order is on zone ${makerOrder.zone}`;

    // Verify that the takerOrder and the makerOrder use the same token
    if (takerOrder.inputToken.toLowerCase() != makerOrder.outputToken.toLowerCase()) return `Taker order is on token ${takerOrder.inputToken} but maker order is on token ${makerOrder.outputToken}`;
    if (takerOrder.outputToken.toLowerCase() != makerOrder.inputToken.toLowerCase()) return `Taker order is on token ${takerOrder.outputToken} but maker order is on token ${makerOrder.inputToken}`;

    // Check that the maker and taker orders have enough inputAmounts
    if (BigInt(takerOrder.inputAmount) < BigInt(makerOrder.outputAmount)) return `Taker order has insufficient input amount to meet maker order's output amount`;
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
    makerSignature,
    takerSignature,
    feeTag,
    feeRecipient
}: AoriMatchingDetails): string {
    return solidityPackedKeccak256([
        "bytes",
        "bytes",
        "string",
        "address",
    ], [
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
    makerOrder,
    takerOrder,
    makerSignature,
    takerSignature,
    feeTag,
    feeRecipient
}: AoriMatchingDetails, signature: string, hookData: string = "0x") {
    return AoriV2__factory.createInterface().encodeFunctionData("settleOrders", [{
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
        matchingHash: getMatchingHash(matching),
        matching,
        matchingSignature,

        makerOrderHash: getOrderHash(matching.makerOrder),
        takerOrderHash: getOrderHash(matching.takerOrder),

        chainId: matching.takerOrder.chainId,
        zone: matching.takerOrder.zone,

        to,
        value,
        data,

        takerPermitSignature, // In case the taker would like to make use of a gasless permit

        maker: matching.makerOrder.offerer,
        taker: matching.takerOrder.offerer,

        inputToken: matching.makerOrder.inputToken,
        inputAmount: matching.makerOrder.inputAmount,
        outputToken: matching.takerOrder.inputToken,
        outputAmount: matching.takerOrder.inputAmount
    }
}

/*//////////////////////////////////////////////////////////////
                    VAULT-RELATED FUNCTIONS
//////////////////////////////////////////////////////////////*/

export function prepareVaultDeployment(deployer: Wallet, aoriProtocol: string, saltPhrase: string, gasLimit: bigint = 10_000_000n): { to: string, data: string, gasLimit: bigint } {
    return {
        to: CREATE3FACTORY_DEPLOYED_ADDRESS,
        data: CREATE3Factory__factory.createInterface().encodeFunctionData("deploy", [id(saltPhrase), solidityPacked(
            [
                "bytes",
                "bytes"
            ], [AoriVault__factory.bytecode, AoriVault__factory.createInterface().encodeDeploy(
                [deployer.address, aoriProtocol],
            )])
        ]),
        gasLimit
    }
}

export function prepareBlastVaultDeployment(deployer: Wallet, aoriProtocol: string, saltPhrase: string, gasLimit: bigint = 10_000_000n): { to: string, data: string, gasLimit: bigint } {
    return {
        to: CREATE3FACTORY_DEPLOYED_ADDRESS,
        data: CREATE3Factory__factory.createInterface().encodeFunctionData("deploy", [id(saltPhrase), solidityPacked(
            [
                "bytes",
                "bytes"
            ], [AoriVaultBlast__factory.bytecode, AoriVaultBlast__factory.createInterface().encodeDeploy(
                [deployer.address, aoriProtocol],
            )])
        ]),
        gasLimit
    }
}

export async function deployVault(wallet: Wallet, {
    chainId = ChainId.ARBITRUM_MAINNET,
    aoriProtocol = getDefaultZone(chainId),
    saltPhrase = `aori-vault-${Math.random().toString(36).substring(2, 7)}`,
    gasLimit = 10_000_000n
}: {
    chainId?: ChainId,
    aoriProtocol: string,
    saltPhrase: string,
    gasLimit?: bigint
}): Promise<string> {

    const destinationAddress = await computeCREATE3Address(getChainProvider(chainId), wallet.address, saltPhrase);
    
    await sendOrRetryTransaction(wallet, {
        ...((chainId == ChainId.BLAST_MAINNET || chainId == ChainId.BLAST_SEPOLIA) ?
            prepareBlastVaultDeployment(wallet, aoriProtocol, saltPhrase, gasLimit) :
            prepareVaultDeployment(wallet, aoriProtocol, saltPhrase, gasLimit)),
        chainId
    });

    return destinationAddress;
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