import { verifyMessage, Wallet } from "ethers";

export function verifyAuthSignature(signatureTimestamp: number, signature: string): string {
    return verifyMessage(`Permission to cancel orders until ${signatureTimestamp}`, signature);
}

export function signAuthSignature(wallet: Wallet, signatureTimestamp: number): string {
    return wallet.signMessageSync(`Permission to cancel orders until ${signatureTimestamp}`);
}

// const wallet = new Wallet(Wallet.createRandom().privateKey);
// const timestamp = Date.now() + 1000 * 60 * 60 * 24 * 7;
// console.log(wallet.address == verifyAuthSignature(timestamp, signAuthSignature(wallet, timestamp)));