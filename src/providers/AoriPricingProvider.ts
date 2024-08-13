import { AORI_PRICING_PROVIDER_API, rawCall } from "../utils";
import { AoriPricingMethods } from "../utils/interfaces";

interface AssetDetails {
    symbol: string,
    address: string,
    logoURI: string,
    name: string,
    decimals: number,
    price: number
}

interface GetTokenResponse {
    chainId: number,
    price: AssetDetails,
    amount?: string,
    amountUSD?: number
}

/*//////////////////////////////////////////////////////////////
                            HELPERS
//////////////////////////////////////////////////////////////*/

const PRICING_API = AORI_PRICING_PROVIDER_API;

export function getTokenPrice(chainId: number, token: string, amount: string): Promise<GetTokenResponse> {
    return rawCall(PRICING_API, AoriPricingMethods.GetToken, [{ chainId, token, amount }]);
}

export async function calculateGasInToken(chainId: number, gas: number, token: string): Promise<bigint> {
    const { gasInToken } = await rawCall<{ gasInToken: string }>(PRICING_API, AoriPricingMethods.CalculateGasInToken, [{ chainId, gas, token }]);
    return BigInt(gasInToken);
}

export function getCurrentGasInToken(chainId: number, gasLimit: number, token: string): Promise<{ chainId: number, gasLimit: number, gasPrice: number, token: string, gasInToken: string, gasInUSD: number }> {
    return rawCall(PRICING_API, AoriPricingMethods.CurrentGasInToken, [{ chainId, gasLimit, token }]);
}