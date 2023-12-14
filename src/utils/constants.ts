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
export const AORI_TAKER_STAGING_API: string = "https://staging.taker.aori.io";
export const AORI_TAKER_DEVELOPMENT_API: string = "https://dev.taker.aori.io";

// Data Provider API
export const AORI_DATA_PROVIDER_API: string = "https://provider.aori.io";

/*//////////////////////////////////////////////////////////////
                    ORDER CONFIGURATION
//////////////////////////////////////////////////////////////*/

export const AORI_ZONE_ADDRESS = "0xEF3137050f3a49ECAe2D2Bae0154B895310D9Dc4";
export const SEAPORT_ADDRESS = "0x00000000000000adc04c56bf30ac9d3c0aaf14dc";
export const SEAPORT_VERSION = "1.5";

export const defaultZoneHash = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const defaultDuration = 24 * 60 * 60;
export const defaultConduitKey = "0x0000000000000000000000000000000000000000000000000000000000000000";
export const maxSalt = 10_000_000;