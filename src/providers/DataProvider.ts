import { BytesLike, Interface, JsonRpcProvider, TransactionRequest, verifyMessage, ZeroAddress } from "ethers";
import { AORI_DATA_PROVIDER_API, AORI_DATA_PROVIDER_APIS, CREATE3FACTORY_DEPLOYED_ADDRESS, getDefaultZone, rawCall, retryIfFail, SEATS_NFT_ADDRESS } from "../utils";
import { AoriDataMethods } from "../utils/interfaces";
import { AoriV2__factory, AoriVault__factory, CREATE3Factory__factory, ERC20__factory } from "../types";
import { getChainProvider } from "../utils/providers";

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

function resolveProvider(chainIdOrProvider: number | JsonRpcProvider): JsonRpcProvider {
    if (typeof chainIdOrProvider == "number") return getChainProvider(chainIdOrProvider);
    return chainIdOrProvider;
}

function DATA_URL() {
    return AORI_DATA_PROVIDER_APIS[Math.floor(Math.random() * AORI_DATA_PROVIDER_APIS.length)]
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

export function hasOrderSettled(chainIdOrProvider: number | JsonRpcProvider, orderHash: string, zone?: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => {
        const contract = AoriV2__factory.connect(zone || getDefaultZone(Number(provider._network.chainId)), provider);
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
        return await contract.isValidSignature(hash, signature) == ZeroAddress;
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

export function computeCREATE3Address(chainIdOrProvider: number | JsonRpcProvider, deployer: string, saltPhrase: string, create3address: string = CREATE3FACTORY_DEPLOYED_ADDRESS) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => CREATE3Factory__factory.connect(create3address, provider).getDeployed(deployer, saltPhrase));
}

export async function isContract(chainIdOrProvider: number | JsonRpcProvider, address: string) {
    return retryIfFail(resolveProvider(chainIdOrProvider), provider => provider.getCode(address).then(code => code != "0x"))
}