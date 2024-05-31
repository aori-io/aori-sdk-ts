import { verifyMessage, Wallet } from "ethers";

export function timestampToAuthMessage(timestamp: number): string {
    return `Permission to cancel orders until ${timestamp}`;
}

export function addressFromAuthSignature(signatureTimestamp: number, signature: string): string {
    return verifyMessage(timestampToAuthMessage(signatureTimestamp), signature);
}

export function signAuthSignature(wallet: Wallet, signatureTimestamp: number): string {
    return wallet.signMessageSync(timestampToAuthMessage(signatureTimestamp));
}

// const wallet = new Wallet(Wallet.createRandom().privateKey);
// const timestamp = Date.now() + 1000 * 60 * 60 * 24 * 7;
// console.log(wallet.address == verifyAuthSignature(timestamp, signAuthSignature(wallet, timestamp)));