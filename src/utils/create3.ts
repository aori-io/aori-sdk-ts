import { AbiCoder, id, keccak256, solidityPacked, Wallet } from "ethers";
import { ChainId, CREATEX_ADDRESS } from "./constants";
import { AoriV2__factory, AoriVault__factory, AoriVaultBlast__factory, CREATEX__factory } from "../types";
import { getChainProvider } from "./providers";
import { getDefaultZone } from "./validation";

/*//////////////////////////////////////////////////////////////
                        CREATE3 HELPERS
//////////////////////////////////////////////////////////////*/

export function createxSalt(address: string, saltString: string) {
    const deploySalt = address + "00" + id(saltString).substring(44);

    return {
        deploySalt,
        guardedSalt: keccak256(AbiCoder.defaultAbiCoder().encode(
            ["address", "bytes32"],
            [address, deploySalt]
        )),
    };
}

export async function computeCREATE3Address(wallet: Wallet, chainId: string | number, saltString: string) {
    const { guardedSalt } = createxSalt(wallet.address, saltString);
    return await CREATEX__factory
        .connect(CREATEX_ADDRESS, wallet.connect(getChainProvider(chainId)))
        ["computeCreate3Address(bytes32)"](guardedSalt);
}

export async function deployViaCREATE3(wallet: Wallet, chainId: string | number, saltString: string, initCode: string) {
    const { deploySalt } = createxSalt(wallet.address, saltString);
    return await CREATEX__factory
        .connect(CREATEX_ADDRESS, wallet.connect(getChainProvider(chainId)))
        ["deployCreate3(bytes32,bytes)"](
            deploySalt,
            initCode
        );
}

export async function isDeployedCREATE3(wallet: Wallet, chainId: string | number, saltString: string) {
    const walletWithProvider = wallet.connect(getChainProvider(chainId));
    if (!walletWithProvider.provider) throw new Error("Wallet has no provider");
    const address = await computeCREATE3Address(walletWithProvider, chainId, saltString);
    return {
        address,
        deployed: await walletWithProvider.provider.getCode(address) !== "0x",
    }
}

/*//////////////////////////////////////////////////////////////
                            INITCODES
//////////////////////////////////////////////////////////////*/

export function aoriV2InitCode(serverSigner: string) {
    return solidityPacked(
        ["bytes", "bytes"],
        [
            AoriV2__factory.bytecode,
            AbiCoder.defaultAbiCoder().encode(
                ["address"],
                [serverSigner],
            ),
        ],
    );
}

export function aoriVaultInitCode(owner: string, aoriProtocol: string) {
    return solidityPacked(
        ["bytes", "bytes"],
        [
            AoriVault__factory.bytecode,
            AbiCoder.defaultAbiCoder().encode(
                ["address", "address"],
                [owner, aoriProtocol],
            ),
        ],
    );
}

export function aoriVaultBlastInitCode(owner: string, aoriProtocol: string) {
    return solidityPacked(
        ["bytes", "bytes"],
        [
            AoriVaultBlast__factory.bytecode,
            AbiCoder.defaultAbiCoder().encode(
                ["address", "address"],
                [owner, aoriProtocol],
            ),
        ],
    );
}

/*//////////////////////////////////////////////////////////////
                        FULL DEPLOYMENTS
//////////////////////////////////////////////////////////////*/

export async function deployVault(wallet: Wallet, {
    chainId = ChainId.ARBITRUM_MAINNET,
    aoriProtocol = getDefaultZone(chainId),
    saltPhrase = `aori-vault-${Math.random().toString(36).substring(2, 7)}`,
}: {
    chainId?: ChainId,
    aoriProtocol: string,
    saltPhrase: string,
}): Promise<string> {
    const vaultAddress = await computeCREATE3Address(wallet, chainId, saltPhrase);

    await deployViaCREATE3(
        wallet,
        chainId,
        (chainId == ChainId.BLAST_MAINNET || chainId == ChainId.BLAST_SEPOLIA)
            ? aoriVaultBlastInitCode(wallet.address, aoriProtocol)
            : aoriVaultInitCode(wallet.address, aoriProtocol),
        saltPhrase
    );

    return vaultAddress;
}