/*//////////////////////////////////////////////////////////////
                            GENERAL
//////////////////////////////////////////////////////////////*/

export enum ChainId {
    ETHEREUM_MAINNET = 1,
    OPTIMISM_MAINNET = 10,
    CRONOS_MAINNET = 25,
    BINANCE_SMART_CHAIN = 56,
    GNOSIS_MAINNET = 100,
    POLYGON_MAINNET = 137,
    MANTA_PACIFIC_MAINNET = 169,
    FANTOM_MAINNET = 250,
    MODE_SEPOLIA = 919,
    MANTLE_MAINNET = 5000,
    CANTO_MAINNET = 7700,
    BASE_MAINNET = 8453,
    ETHEREUM_HOLESKY = 17000,
    MODE_MAINNET = 34443,
    ARBITRUM_MAINNET = 42161,
    CELO_MAINNET = 42220,
    AVAX_MAINNET = 43114,
    LINEA_MAINNET = 59144,
    BERACHAIN_ARTIO = 80085,
    BLAST_MAINNET = 81457,
    BASE_SEPOLIA = 84532,
    TAIKO_MAINNET = 167000,
    TAIKO_KATLA = 167008,
    ARBITRUM_SEPOLIA = 421614,
    SCROLL_SEPOLIA = 534351,
    SCROLL_MAINNET = 534352,
    SEI_EVM_DEVNET = 713715,
    MANTA_PACIFIC_SEPOLIA = 3441006,
    SEPOLIA = 11155111,
    BLAST_SEPOLIA = 168587773
}

export const AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES = new Map<number, string>([

    /*//////////////////////////////////////////////////////////////
                                MAINNETS
    //////////////////////////////////////////////////////////////*/

    [ChainId.BASE_MAINNET, "0x82F75ffFC29D9b439EF2b4C80537608D9f52732f"],

    [ChainId.ARBITRUM_MAINNET, "0x82F75ffFC29D9b439EF2b4C80537608D9f52732f"],

    /*//////////////////////////////////////////////////////////////
                                TESTNETS
    //////////////////////////////////////////////////////////////*/

    [ChainId.SEPOLIA, "0x82F75ffFC29D9b439EF2b4C80537608D9f52732f"],
]);

export const AORI_V2_ADDRESS = "0x82F75ffFC29D9b439EF2b4C80537608D9f52732f";
export const AORI_V2_PRINCIPAL_MATCH_ZONE = "0x06EDDbe3e5C87AD84360684dCAE6121bd603dfA6";

export const SUPPORTED_AORI_CHAINS = new Set(AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.keys());

export const CREATEX_ADDRESS = "0xba5Ed099633D3B313e4D5F7bdc1305d3c28ba5Ed";

/*//////////////////////////////////////////////////////////////
                        WEBSOCKET URLS
//////////////////////////////////////////////////////////////*/

export const AORI_HTTP_API: string = "https://api.aori.io";
export const AORI_WS_API: string = "wss://api.aori.io";

// Data Provider API
export const AORI_DATA_PROVIDER_API: string = "https://provider.aori.io";

export const AORI_DATA_PROVIDER_APIS: string[] = [
    AORI_DATA_PROVIDER_API,
];

// Pricing Provider API
export const AORI_PRICING_PROVIDER_API: string = "https://pricing.aori.io";

// Settlement Provider API
export const AORI_SETTLEMENT_PROVIDER_API: string = "https://settlement.aori.io";

/*//////////////////////////////////////////////////////////////
                                FEE
//////////////////////////////////////////////////////////////*/

// Used to calculate the amount that an incoming taker must pay to take a limit order
export function getAmountPlusFee(amount: string, feeInBips: number) {
    return (BigInt(amount) * (10000n + BigInt(feeInBips)) / 10000n);
}

// Used to calculate the amount in the outputAmount that the taker gets less of
export function getAmountMinusFee(amount: string, feeInBips: number) {
    return (BigInt(amount) * 10000n / (10000n + BigInt(feeInBips)));
}

export const AORI_DEFAULT_FEE_TAG = "aori";
export const AORI_DEFAULT_FEE_IN_BIPS = 3;
export const AORI_DEFAULT_FEE_RECIPIENT = "0xB1a2f2A4c79C7C7Ba1Ac161ad0BDeCf11350dAa7";

// Seats
export const SEATS_NFT_ADDRESS = "0xD539e71371414F027Af025fd1EfFb6e11b5C902A";
export const SEATS_DAO_ADDRESS = "0x6E0Fd80bA37EC02855E4A8D7574f685984d83a5E";