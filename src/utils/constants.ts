/*//////////////////////////////////////////////////////////////
                            GENERAL
//////////////////////////////////////////////////////////////*/

export const AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES = new Map<number, Set<string>>([
    // Ethereum Goerli
    [5, new Set([
        "0xCB93Ed64a1b4C61b809F556532Ff36EA25DaD473".toLowerCase()
    ])]
]);

export const SUPPORTED_AORI_CHAINS = new Set(AORI_V2_SINGLE_CHAIN_ZONE_ADDRESSES.keys());

/*//////////////////////////////////////////////////////////////
                        WEBSOCKET URLS
//////////////////////////////////////////////////////////////*/

export const AORI_API: string = "wss://api.aori.io";
export const AORI_FEED: string = "wss://feed.aori.io";
export const AORI_PRODUCTION_API: string = "wss://api.aori.io";
export const AORI_PRODUCTION_FEED: string = "wss://feed.aori.io";
export const AORI_STAGING_API: string = "wss://staging.api.aori.io";
export const AORI_STAGING_FEED: string = "wss://staging.feed.aori.io";
export const AORI_DEVELOPMENT_API: string = "wss://dev.api.aori.io";
export const AORI_DEVELOPMENT_FEED: string = "wss://dev.feed.aori.io";

/*//////////////////////////////////////////////////////////////
                        HTTP POST URLS
//////////////////////////////////////////////////////////////*/

// Main Aori API for facilitating CRUD operations
export const AORI_HTTP_API: string = "https://api.aori.io";
export const AORI_HTTP_PRODUCTION_API: string = "https://api.aori.io";
export const AORI_HTTP_STAGING_API: string = "https://staging.api.aori.io";
export const AORI_HTTP_DEVELOPMENT_API: string = "https://dev.api.aori.io";

// Taker Service for facilitating UX-friendly Market Orders
export const AORI_TAKER_API: string = "https://taker.aori.io";
export const AORI_TAKER_PRODUCTION_API: string = "https://taker.aori.io";

// Data Provider API
export const AORI_DATA_PROVIDER_API: string = "https://provider.aori.io";

// Pricing Provider API
export const AORI_PRICING_PROVIDER_API: string = "https://pricing.aori.io";

// Solution Store
export const AORI_SOLUTION_STORE_API: string = "https://solution.aori.io";

// Mempool Provider API
export const AORI_MEMPOOL_PROVIDER_API: string = "https://mempool.aori.io";

/*//////////////////////////////////////////////////////////////
                    ORDER CONFIGURATION
//////////////////////////////////////////////////////////////*/

export const defaultDuration = 24 * 60 * 60;
export const maxSalt = 10_000_000;

/*//////////////////////////////////////////////////////////////
                            SEATS
//////////////////////////////////////////////////////////////*/

export const DEFAULT_SEAT_ID = 0;
export const DEFAULT_SEAT_SCORE = 1;
export const DEFAULT_SEAT_HOLDER = "0x2EDEB6E06E81020F48d930FA7444a592ebE9FaB6";

export const SEATS_NFT_ADDRESS = "0xD539e71371414F027Af025fd1EfFb6e11b5C902A";
export const SEATS_DAO_ADDRESS = "0x6E0Fd80bA37EC02855E4A8D7574f685984d83a5E";