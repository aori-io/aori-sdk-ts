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

export const AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES = new Map<number, Set<string>>([

    /*//////////////////////////////////////////////////////////////
                                MAINNETS
    //////////////////////////////////////////////////////////////*/

    [ChainId.ETHEREUM_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.OPTIMISM_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.BINANCE_SMART_CHAIN, new Set([
        // "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(), - to deploy
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.GNOSIS_MAINNET, new Set([
        // "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(), - to deploy
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.POLYGON_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.BASE_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.ARBITRUM_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase(),
        "0x6A979916234013AbA003d906e4e7136496B90AA6".toLowerCase()
    ])],

    [ChainId.CELO_MAINNET, new Set([
        // "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(), - to deploy
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.AVAX_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.LINEA_MAINNET, new Set([
        // "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(), - to deploy
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.BLAST_MAINNET, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase()
    ])],

    [ChainId.SCROLL_MAINNET, new Set([
        // "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(), - to deploy
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase(),
    ])],

    /*//////////////////////////////////////////////////////////////
                                TESTNETS
    //////////////////////////////////////////////////////////////*/

    [ChainId.ARBITRUM_SEPOLIA, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase(),
        "0x6A979916234013AbA003d906e4e7136496B90AA6".toLowerCase()
    ])],

    [ChainId.SEPOLIA, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase(),
        "0x6A979916234013AbA003d906e4e7136496B90AA6".toLowerCase()
    ])],
    [ChainId.BERACHAIN_ARTIO, new Set([
        "0x0AD86842EadEe5b484E31db60716EB6867B46e21".toLowerCase(),
        "0xcc1A0DA89593441571f35Dd99a0aC1856d3F1FB5".toLowerCase(),
    ])]
]);

export const SUPPORTED_AORI_CHAINS = new Set(AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.keys());

export const CREATE3FACTORY_DEPLOYED_ADDRESS = "0x2Dfcc7415D89af828cbef005F0d072D8b3F23183";

/*//////////////////////////////////////////////////////////////
                        WEBSOCKET URLS
//////////////////////////////////////////////////////////////*/

export const AORI_HTTP_API: string = "https://rfq.aori.io";
export const AORI_WS_API: string = "wss://rfq.aori.io";

// Data Provider API
export const AORI_DATA_PROVIDER_API: string = "https://provider.aori.io";
export const AORI_DATA_PROVIDER_2_API: string = "https://provider2.aori.io";
export const AORI_DATA_PROVIDER_3_API: string = "https://provider3.aori.io";

export const AORI_DATA_PROVIDER_APIS: string[] = [
    AORI_DATA_PROVIDER_API,
    AORI_DATA_PROVIDER_2_API,
    AORI_DATA_PROVIDER_3_API,
];

// Pricing Provider API
export const AORI_PRICING_PROVIDER_API: string = "https://pricing.aori.io";

/*//////////////////////////////////////////////////////////////
                            SEATS
//////////////////////////////////////////////////////////////*/

export const DEFAULT_SEAT_ID = 0;
export const DEFAULT_SEAT_SCORE = 1;
export const DEFAULT_SEAT_HOLDER = "0x2EDEB6E06E81020F48d930FA7444a592ebE9FaB6";

export const SEATS_NFT_ADDRESS = "0xD539e71371414F027Af025fd1EfFb6e11b5C902A";
export const SEATS_DAO_ADDRESS = "0x6E0Fd80bA37EC02855E4A8D7574f685984d83a5E";