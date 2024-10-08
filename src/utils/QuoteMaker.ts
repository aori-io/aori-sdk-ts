import { Wallet } from "ethers";
import { QuoteRequestedDetails, SubscriptionEvents, TradeMatchedDetails } from "./interfaces";
import { getCurrentGasInToken, RFQProvider } from "../providers";
import { approveTokenCall, createAndSignResponse, settleOrders, settleOrdersViaVault } from "./helpers";

/*//////////////////////////////////////////////////////////////
                               TYPES
//////////////////////////////////////////////////////////////*/

export interface PriceRequest {
    fromAddress: string;
    inputToken: string;
    outputToken: string;
    inputAmount?: string;
    outputAmount?: string;
    chainId: number;
}
type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }

export type OutputAmountRequest = WithRequired<PriceRequest, "inputAmount">
export type InputAmountRequest = WithRequired<PriceRequest, "outputAmount">

export interface Calldata {
    outputAmount: bigint;
    to: string;
    value: number;
    data: string;
}
export type Quote = {
    outputAmount: bigint;
    price: number;
    gas: bigint;
}

export interface Quoter {
    name: () => string;
    getOutputAmountQuote: ({ inputToken, outputToken, inputAmount }: OutputAmountRequest) => Promise<Quote>;
    getInputAmountQuote: ({ inputToken, outputToken, outputAmount }: InputAmountRequest) => Promise<Quote>;
    generateCalldata: ({ inputToken, outputToken, inputAmount, outputAmount }: OutputAmountRequest) => Promise<Calldata>;
}

/*//////////////////////////////////////////////////////////////
                            QUOTEMAKER
//////////////////////////////////////////////////////////////*/

export class QuoteMaker {
    wallet: Wallet;
    feedRFQ: RFQProvider;
    vaultContract?: string;
    quoter: Quoter;

    logQuotes = false;
    sponsorGas = false;
    gasLimit: bigint;
    gasPriceMultiplier: number;
    spreadPercentage: bigint;

    constructor({
        wallet,
        feedUrl,
        vaultContract,
        quoter,
        sponsorGas,
        gasLimit,
        gasPriceMultiplier,
        spreadPercentage,
        logQuotes
    }: {
        wallet: Wallet,
        feedUrl: string,
        vaultContract?: string,
        quoter: Quoter,
        sponsorGas?: boolean,
        gasLimit?: bigint,
        gasPriceMultiplier?: number,
        spreadPercentage?: bigint,
        logQuotes?: boolean
    }) {
        /*//////////////////////////////////////////////////////////////
                                 SET PROPERTIES
        //////////////////////////////////////////////////////////////*/

        this.wallet = wallet;
        this.quoter = quoter;
        this.vaultContract = vaultContract;
        this.logQuotes = logQuotes || false;
        this.gasLimit = gasLimit || 5_000_000n;
        this.gasPriceMultiplier = gasPriceMultiplier || 1.1;
        this.spreadPercentage = spreadPercentage || 0n;

        /*//////////////////////////////////////////////////////////////
                               FEED CONFIGURATION
        //////////////////////////////////////////////////////////////*/

        this.feedRFQ = new RFQProvider(feedUrl);

        this.feedRFQ.on(SubscriptionEvents.QuoteRequested, (requestDetails) => {
            this.generateQuote(requestDetails).catch(console.log);
        });

        this.feedRFQ.on(SubscriptionEvents.TradeMatched, async (detailsToExecute) => {
            const { tradeId, detailsToExecute: { to, value, data }, chainId } = detailsToExecute;
            console.log(`📦 Received an Order-To-Execute:`, { tradeId, to, value, data, chainId });
            try {
                await this.settleOrders(detailsToExecute);
            } catch (e: any) {
                console.log(e);
            }
        });
    }

    activeAddress() {
        return this.vaultContract || this.wallet.address;
    }

    async generateQuote({
        tradeId,
        inputToken,
        outputToken,
        inputAmount, // Amount that the user is willing to pay
        chainId,
        zone,
        retries = 3,
    }: QuoteRequestedDetails & { retries?: number }) {
        if (tradeId == undefined || inputAmount == undefined || inputAmount == "0") return;

        let count = 0;
        while (count <= retries) {
            try {
                /*//////////////////////////////////////////////////////////////
                                        GET QUOTE
                //////////////////////////////////////////////////////////////*/

                const startTime = Date.now();
                const { outputAmount } = await this.quoter.getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress: this.activeAddress(), chainId });

                if (outputAmount == 0n) {
                    console.log(`✍️ Quote for ${inputToken} -> ${outputToken} is 0, not posting quote`);
                    return;
                }

                if (this.logQuotes) {
                    const endTime = Date.now();
                    console.log(`✍️ ${this.quoter.name()} quote for ${inputAmount} ${inputToken} -> ${outputToken} (${chainId}) is ${outputAmount} ${outputToken} in ${Math.round(endTime - startTime)}ms`);
                }

                /*//////////////////////////////////////////////////////////////
                                        SPONSOR GAS
                //////////////////////////////////////////////////////////////*/

                let gasInToken = 0n;
                if (this.sponsorGas) await getCurrentGasInToken(chainId, Number(this.gasLimit), outputToken)
                    .then(({ gasInToken: _gasInToken }) => { gasInToken = BigInt(_gasInToken); })
                    .catch(() => { gasInToken = outputAmount / 10_000n; });

                if (outputAmount < gasInToken) throw `✍️ Quote for ${inputToken} -> ${outputToken} when gas is ${gasInToken} in ${outputToken} is too low (to ${outputAmount})`;

                const { order: responseOrder, orderHash, signature: responseSignature } = await createAndSignResponse(this.wallet, {
                    offerer: this.vaultContract || this.wallet.address,
                    inputToken: outputToken,
                    outputToken: inputToken,
                    inputAmount: (outputAmount - gasInToken) * (10_000n - this.spreadPercentage) / 10_000n,
                    outputAmount: BigInt(inputAmount),
                    zone,
                    chainId
                });

                this.feedRFQ.respond(tradeId, {
                    order: responseOrder,
                    signature: responseSignature
                });

                return { order: responseOrder, orderHash };
            } catch (e: any) {
                console.log(e);
                count++;
            }
        }

        console.log(`✍️ Failed to generate quote after ${retries} retries for ${inputAmount} ${inputToken} -> ${outputToken}`);

        return;
    }

    /*//////////////////////////////////////////////////////////////
                             SETTLE ORDERS
    //////////////////////////////////////////////////////////////*/

    async settleOrders(tradeMatchedDetails: TradeMatchedDetails, retryCount = 2): Promise<void> {
        const { inputToken, outputAmount: _outputForUser, outputToken, detailsToExecute, chainId, zone } = tradeMatchedDetails;

        // If no vault contract is set, settle via EOA
        if (this.vaultContract == undefined) {
            if (await settleOrders(this.wallet, detailsToExecute, { gasLimit: this.gasLimit, gasPriceMultiplier: this.gasPriceMultiplier })) {
                console.log(`Successfully sent transaction`);
                return;
            } else {
                if (retryCount != 0) return await this.settleOrders(tradeMatchedDetails, retryCount - 1);
                throw new Error("Failed to settle transaction");
            }
        }

        let quoterTo: string = "", quoterValue: number = 0, quoterData: string = "0x";
        try {
            // Generate calldata for quoter
            const { to, value, data, outputAmount } = await this.quoter.generateCalldata({
                inputToken: outputToken,
                inputAmount: _outputForUser,
                outputToken: inputToken,
                chainId,
                fromAddress: this.activeAddress()
            });
            quoterTo = to; quoterValue = value; quoterData = data;
            if (outputAmount == 0n) throw new Error("Output amount is zero");
        } catch (e: any) {
            if (retryCount != 0) return await this.settleOrders(tradeMatchedDetails, retryCount - 1);
            throw new Error(`Failed to generate calldata for quoter: ${e}`);
        }

        /*//////////////////////////////////////////////////////////////
                                    SEND TX
        //////////////////////////////////////////////////////////////*/

        // Attempt to settle it via the vault
        if (await settleOrdersViaVault(this.wallet, detailsToExecute, {
            gasPriceMultiplier: this.gasPriceMultiplier,
            gasLimit: this.gasLimit,
            preSwapInstructions: (quoterTo != this.activeAddress() && quoterTo != "") ? [
                approveTokenCall(inputToken, zone, 10n ** 26n),
                approveTokenCall(outputToken, quoterTo, 10n ** 26n),
                { to: quoterTo, value: quoterValue, data: quoterData }
            ] : [],
            postSwapInstructions: []
        })) {
            console.log(`Successfully sent transaction`);
        } else {
            if (retryCount != 0) return await this.settleOrders(tradeMatchedDetails, retryCount - 1);
            throw new Error("Failed to settle transaction via vault");
        }
    }    
}
