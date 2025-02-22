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

    [ChainId.BASE_MAINNET, "0x2910011b916A62e260d38DfAA4F357AFFb190dd0"],

    [ChainId.ARBITRUM_MAINNET, "0x2910011b916A62e260d38DfAA4F357AFFb190dd0"],

    /*//////////////////////////////////////////////////////////////
                                TESTNETS
    //////////////////////////////////////////////////////////////*/

    [ChainId.SEPOLIA, "0x2910011b916A62e260d38DfAA4F357AFFb190dd0"],
]);

export const AORI_V2_ADDRESS = "0x2910011b916A62e260d38DfAA4F357AFFb190dd0";
export const AORI_V2_PRINCIPAL_MATCH_ZONE = "0xf9155B47f3F27eaB1374Bb13e48E66073B55C8A8";

export const SUPPORTED_AORI_CHAINS = new Set(AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.keys());

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

// Data Server API 
export const AORI_DATA_SERVER_API: string = "https://data.aori.io/";


// Pricing Provider API
export const AORI_PRICING_PROVIDER_API: string = "https://pricing.aori.io";

// Settlement Provider API
export const AORI_SETTLEMENT_PROVIDER_API: string = "https://settlement.aori.io";

// Quoter API
export const AORI_QUOTER_API: string = 'https://quoter.aori.io/'

// Seats
export const SEATS_NFT_ADDRESS = "0xD539e71371414F027Af025fd1EfFb6e11b5C902A";
export const SEATS_DAO_ADDRESS = "0x6E0Fd80bA37EC02855E4A8D7574f685984d83a5E";