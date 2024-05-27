import { verifyMessage, Wallet } from "ethers";

export function verifyAuthSignature(address: string, signature: string): boolean {
    return address == verifyMessage(`${address}-01/${new Date().getMonth()}`, signature);
}

export function signAuthSignature(wallet: Wallet): string {
    return wallet.signMessageSync(`${wallet.address}-01/${new Date().getMonth()}`);
}

// verifyAuthSignature(_wallet.address, signAuthSignature(_wallet));