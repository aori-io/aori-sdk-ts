import { Wallet } from "ethers";
import { AoriFeedProvider, cancelOrder, createAndMakeOrder, getCurrentGasInToken, settleOrders, settleOrdersViaVault } from "../providers";
import { Quoter } from "./Quoter";
import { AORI_FEED, AORI_HTTP_API } from "./constants";
import { DetailsToExecute, SubscriptionEvents } from "./interfaces";
import { signOrderHashSync } from "./helpers";
import { timestampToAuthMessage } from "./helpers";
import { approveTokenCall } from "./helpers";

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
        spreadPercentage = 5n
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
        spreadPercentage?: bigint
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
                const { makerOrderHash, takerOrderHash, to, value, data, chainId } = detailsToExecute;

                // Do an initial check
                if (!this.createdOrders.has(makerOrderHash)) return;
                console.log(`📦 Received an Order-To-Execute:`, { makerOrderHash, takerOrderHash, to, value, data, chainId });
                await this.settleOrders(detailsToExecute);
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
    }: {
        inputToken: string;
        outputToken: string;
        inputAmount: string;
        cancelAfter?: number,
        settleTx?: boolean,
        chainId: number
    }) {
        if (inputAmount == undefined || inputAmount == "0") return;

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

        if (outputAmount < gasInToken) return console.log(`✍️ Quote for ${inputToken} -> ${outputToken} when gas is ${gasInToken} in ${outputToken} is too low (to ${outputAmount})`);

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

        if (cancelAfter) {
            setTimeout(
                () => {
                    if (this.apiKey) {
                        cancelOrder({
                            orderHash,
                            apiKey: this.apiKey,
                        })
                    } else {
                        const timeout = Date.now() + 10_000;
                        cancelOrder({
                            orderHash,
                            signature: signOrderHashSync(this.wallet, timestampToAuthMessage(timeout)),
                            signatureTimestamp: timeout
                        })
                    }

                },
                cancelAfter,
            );
        }
        return { order, orderHash }
    }

    /*//////////////////////////////////////////////////////////////
                             SETTLE ORDERS
    //////////////////////////////////////////////////////////////*/

    async settleOrders(detailsToExecute: DetailsToExecute, retryCount = 5): Promise<void> {
        const { inputToken, matching, outputToken, chainId, makerZone } = detailsToExecute;

        if (this.vaultContract == undefined) {
            if (await settleOrders(this.wallet, detailsToExecute, this.gasLimit)) {
                console.log(`Successfully sent transaction`);
            } else {
                if (retryCount != 0) return await this.settleOrders(detailsToExecute, retryCount - 1);
                console.log(`Failed to send transaction`);
            }
            return;
        }

        const { to: quoterTo, value: quoterValue, data: quoterData } = await this.quoter.generateCalldata({
            inputToken: outputToken,
            inputAmount: matching.makerOrder.outputAmount,
            outputToken: inputToken,
            chainId,
            fromAddress: this.activeAddress()
        });

        /*//////////////////////////////////////////////////////////////
                                    SEND TX
        //////////////////////////////////////////////////////////////*/

        if (await settleOrdersViaVault(this.wallet, detailsToExecute, {
            gasLimit: this.gasLimit,
            preSwapInstructions: (quoterTo != this.activeAddress() && quoterTo != "") ? [
                approveTokenCall(inputToken, makerZone, 10n ** 18n),
                approveTokenCall(outputToken, quoterTo, 10n ** 18n),
                { to: quoterTo, value: quoterValue, data: quoterData }
            ] : [],
            postSwapInstructions: []
        })) {
            console.log(`Successfully sent transaction`);
        } else {
            if (retryCount != 0) return await this.settleOrders(detailsToExecute, retryCount - 1);
            console.log(`Failed to send transaction`);
        }
    }

    async terminate() {
        await this.feed.terminate();
    }

}