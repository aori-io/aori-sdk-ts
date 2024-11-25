import { AbiCoder } from "ethers";

export type InstructionStruct = {
    to: string;
    value: bigint | number;
    data: string;
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
    instructions: InstructionStruct[]
) {
    return AbiCoder.defaultAbiCoder().encode(
        // @ts-ignore
        [InstructionTypeABI],
        [instructions]
    )
}

export function decodeInstructions(encoded: string) {
    return AbiCoder.defaultAbiCoder().decode(
        // @ts-ignore
        [InstructionTypeABI],
        encoded
    )
}