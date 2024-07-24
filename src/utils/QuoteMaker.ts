import { Wallet } from "ethers";
import { AoriFeedProvider, cancelOrder, createAndMakeOrder, failOrder, getCurrentGasInToken, settleOrders, settleOrdersViaVault } from "../providers";
import { Quoter } from "./Quoter";
import { AORI_FEED, AORI_HTTP_API } from "./constants";
import { DetailsToExecute, OrderView, SubscriptionEvents } from "./interfaces";
import { signOrderHashSync, approveTokenCall, signMatchingSync } from "./helpers";

export enum ExecutionStrictness {
    ANY_ON_CHAIN = 0,
    ONLY_HASH = 1
}

export class QuoteMaker {

    wallet: Wallet;
    apiUrl: string;

    feed: AoriFeedProvider = null as any;
    createdOrders = new Set<string>();
    quoter: Quoter;

    vaultContract?: string;
    apiKey?: string;
    logQuotes = false;
    sponsorGas = false;
    gasLimit: bigint = 5_000_000n;
    gasPriceMultiplier: number = 1.1;
    spreadPercentage: bigint = 0n;

    /*//////////////////////////////////////////////////////////////
                               INITIALISE
    //////////////////////////////////////////////////////////////*/

    constructor({
        wallet,
        apiUrl = AORI_HTTP_API,
        feedUrl = AORI_FEED,
        vaultContract,
        apiKey,
        defaultChainId = 5,
        quoter,
        logQuotes = false,
        sponsorGas = false,
        cancelAfter,
        gasLimit = 5_000_000n,
        spreadPercentage = 5n,
        executionStrictness = ExecutionStrictness.ONLY_HASH
    }:{
        wallet: Wallet,
        apiUrl?: string,
        feedUrl?: string,
        vaultContract?: string,
        apiKey?: string,
        defaultChainId?: number,
        quoter: Quoter,
        logQuotes?: boolean,
        sponsorGas?: boolean,
        cancelAfter?: number,
        gasLimit?: bigint,
        spreadPercentage?: bigint,
        executionStrictness?: ExecutionStrictness
    }) {
        /*//////////////////////////////////////////////////////////////
                                 SET PROPERTIES
        //////////////////////////////////////////////////////////////*/

        this.wallet = wallet;
        this.apiUrl = apiUrl;
        this.feed = new AoriFeedProvider({ feedUrl });
        this.vaultContract = vaultContract;
        this.apiKey = apiKey;
        this.quoter = quoter;
        this.logQuotes = logQuotes;
        this.sponsorGas = sponsorGas;
        this.gasLimit = gasLimit;
        this.spreadPercentage = spreadPercentage;

        /*//////////////////////////////////////////////////////////////
                               FEED CONFIGURATION
        //////////////////////////////////////////////////////////////*/

        this.feed.on("ready", () => {

            this.feed.subscribe();

            this.feed.on(SubscriptionEvents.QuoteRequested, async ({ inputToken, inputAmount, outputToken, chainId }) => {
                if (chainId == defaultChainId) {
                    if (inputAmount == undefined || inputAmount == "0") return;
                    this.generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId, cancelAfter }).catch(console.log);
                }
            });

            this.feed.on(SubscriptionEvents.OrderToExecute, async (detailsToExecute) => {
                const { makerOrderHash, takerOrderHash, to, value, data, chainId, maker } = detailsToExecute;

                // Do an initial check
                if (executionStrictness == ExecutionStrictness.ONLY_HASH && !this.createdOrders.has(makerOrderHash)) return;
                if (executionStrictness == ExecutionStrictness.ANY_ON_CHAIN && (chainId != defaultChainId || maker != this.activeAddress())) return;
                
                console.log(`📦 Received an Order-To-Execute:`, { makerOrderHash, takerOrderHash, to, value, data, chainId });
                try {
                    await this.settleOrders(detailsToExecute);
                } catch (e: any) {
                    console.log(e);
                    failOrder({
                        matching: detailsToExecute.matching,
                        matchingSignature: detailsToExecute.matchingSignature,
                        makerMatchingSignature: signMatchingSync(this.wallet, detailsToExecute.matching)
                    }, this.apiUrl).then(() => console.log("Order failed")).catch(console.log);
                }
            });
        });
    }

    activeAddress(): string {
        return this.vaultContract || this.wallet.address;
    }

    /*//////////////////////////////////////////////////////////////
                          GENERATE QUOTE ORDER
    //////////////////////////////////////////////////////////////*/

    async generateQuoteOrder({
        inputToken,
        outputToken,
        inputAmount, // Amount that the user is willing to pay
        chainId,
        cancelAfter,
        retries = 3,
    }: {
        inputToken: string;
        outputToken: string;
        inputAmount: string;
        cancelAfter?: number,
        settleTx?: boolean,
        chainId: number,
        retries?: number
    }) {
        if (inputAmount == undefined || inputAmount == "0") return;

        let count = 0;
        while (count <= retries) {
            try {
                /*//////////////////////////////////////////////////////////////
                                        GET QUOTE
                //////////////////////////////////////////////////////////////*/

                const startTime = Date.now();
                const { outputAmount } = await this.quoter.getOutputAmountQuote({ inputToken, outputToken, inputAmount, fromAddress: this.activeAddress(), chainId });

                if (this.logQuotes) {
                    const endTime = Date.now();
                    console.log(`✍️ ${this.quoter.name()} quote for ${inputAmount} ${inputToken} -> ${outputToken} is ${outputAmount} ${outputToken} in ${Math.round(endTime - startTime)}ms`);
                }

                /*//////////////////////////////////////////////////////////////
                                        SPONSOR GAS
                //////////////////////////////////////////////////////////////*/

                let gasInToken = 0n;
                if (this.sponsorGas) await getCurrentGasInToken(chainId, Number(this.gasLimit), outputToken)
                    .then(({ gasInToken: _gasInToken }) => { gasInToken = BigInt(_gasInToken); })
                    .catch(() => { gasInToken = outputAmount / 10_000n; });

                if (outputAmount < gasInToken) throw `✍️ Quote for ${inputToken} -> ${outputToken} when gas is ${gasInToken} in ${outputToken} is too low (to ${outputAmount})`;

                const { orderHash, order } = await createAndMakeOrder(this.wallet, {
                    offerer: this.activeAddress(),
                    inputToken: outputToken,
                    outputToken: inputToken,
                    inputAmount: (outputAmount - gasInToken) * (10_000n - this.spreadPercentage) / 10_000n,
                    outputAmount: BigInt(inputAmount),
                    chainId
                }, this.apiUrl);

                this.createdOrders.add(orderHash);

                /*//////////////////////////////////////////////////////////////
                                        CANCELAFTER
                //////////////////////////////////////////////////////////////*/

                if (cancelAfter) setTimeout(() => order.cancel().catch(console.log), cancelAfter);

                return { order, orderHash };
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

    async settleOrders(detailsToExecute: DetailsToExecute, retryCount = 2): Promise<void> {
        const { inputToken, matching, outputToken, chainId, makerZone } = detailsToExecute;

        // If no vault contract is set, settle via EOA
        if (this.vaultContract == undefined) {
            if (await settleOrders(this.wallet, detailsToExecute, { gasLimit: this.gasLimit, gasPriceMultiplier: this.gasPriceMultiplier })) {
                console.log(`Successfully sent transaction`);
                return;
            } else {
                if (retryCount != 0) return await this.settleOrders(detailsToExecute, retryCount - 1);
                throw new Error("Failed to settle transaction");
            }
        }

        let quoterTo: string = "", quoterValue: number = 0, quoterData: string = "0x";
        try {
            // Generate calldata for quoter
            const { to, value, data, outputAmount } = await this.quoter.generateCalldata({
                inputToken: outputToken,
                inputAmount: matching.makerOrder.outputAmount,
                outputToken: inputToken,
                chainId,
                fromAddress: this.activeAddress()
            });
            quoterTo = to; quoterValue = value; quoterData = data;
            if (outputAmount == 0n) throw new Error("Output amount is zero");
        } catch (e: any) {
            if (retryCount != 0) return await this.settleOrders(detailsToExecute, retryCount - 1);
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
                approveTokenCall(inputToken, makerZone, 10n ** 26n),
                approveTokenCall(outputToken, quoterTo, 10n ** 26n),
                { to: quoterTo, value: quoterValue, data: quoterData }
            ] : [],
            postSwapInstructions: []
        })) {
            console.log(`Successfully sent transaction`);
        } else {
            if (retryCount != 0) return await this.settleOrders(detailsToExecute, retryCount - 1);
            throw new Error("Failed to settle transaction via vault");
        }
    }

    async terminate() {
        await this.feed.terminate();
    }

}