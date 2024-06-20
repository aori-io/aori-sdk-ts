import { parseEther, Wallet } from "ethers";
import { AoriDataProvider, AoriFeedProvider, AoriPricingProvider, calculateGasInToken, cancelOrder, createAndMakeOrder, getFeeData, settleOrdersViaVault } from "../providers";
import { ERC20__factory } from "../types";
import { Quoter } from "./Quoter";
import { AORI_FEED, AORI_HTTP_API } from "./constants";
import { DetailsToExecute, SubscriptionEvents } from "./interfaces";
import { signOrderHashSync } from "./helpers";

export class QuoteMaker {

    wallet: Wallet;
    apiUrl: string;

    feed: AoriFeedProvider = null as any;
    dataProvider = new AoriDataProvider();
    pricingProvider = new AoriPricingProvider();
    createdOrders = new Set<string>();
    quoter: Quoter;

    vaultContract?: string;
    apiKey?: string;
    seatId = 0;
    logQuotes = false;
    sponsorGas = false;
    gasLimit: bigint = 5_000_000n;
    spreadPercentage: bigint = 0n;
    defaultChainId: number;

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
        seatId = 0,
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
        seatId?: number,
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
        this.defaultChainId = defaultChainId;
        this.seatId = seatId;
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
                if (chainId == this.defaultChainId) {
                    if (inputAmount == undefined || inputAmount == "0") return;
                    try {
                        await this.generateQuoteOrder({ inputToken, inputAmount, outputToken, chainId, cancelAfter });
                    } catch (e: any) {
                        console.log(e);
                    }
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
        const { outputAmount } = await this.quoter.getOutputAmountQuote({
            inputToken,
            outputToken,
            inputAmount,
            fromAddress: this.vaultContract || this.wallet.address,
            chainId
        });

        if (this.logQuotes) {
            const endTime = Date.now();
            console.log(`✍️ ${this.quoter.name()} quote for ${inputAmount} ${inputToken} -> ${outputToken} is ${outputAmount} ${outputToken} in ${Math.round(endTime - startTime)}ms`);
        }

        /*//////////////////////////////////////////////////////////////
                                  SPONSOR GAS
        //////////////////////////////////////////////////////////////*/

        let gasInToken = 0n;
        if (this.sponsorGas) {
            const { gasPrice } = await getFeeData(chainId);
            try {
                gasInToken = await calculateGasInToken(
                    chainId, // chainId
                    Number((BigInt(this.gasLimit) * BigInt(gasPrice)).toString()), // gas
                    outputToken // token
                );
            } catch (e: any) {
                // TODO: find better way to handle this
                // Chip off 10 bips for gas
                gasInToken = outputAmount / 10_000n;
            }
        }

        if (outputAmount < gasInToken) {
            console.log(`✍️ Quote for ${inputToken} -> ${outputToken} when gas is ${gasInToken} in ${outputToken} is too low`);
            return;
        }

        const createdLimitOrder = await createAndMakeOrder(this.wallet, {
            offerer: this.vaultContract || this.wallet.address,
            inputToken: outputToken,
            outputToken: inputToken,
            inputAmount: (outputAmount - gasInToken) * (10_000n - this.spreadPercentage) / 10_000n,
            outputAmount: BigInt(inputAmount),
            chainId: this.defaultChainId
        }, this.apiUrl);

        /*//////////////////////////////////////////////////////////////
                                  CANCELAFTER
        //////////////////////////////////////////////////////////////*/

        if (cancelAfter) {
            setTimeout(async () => {
                try {
                    await cancelOrder({
                        orderHash: createdLimitOrder.orderHash,
                        apiKey: this.apiKey,
                        signature: signOrderHashSync(this.wallet, createdLimitOrder.orderHash)
                    }, this.apiUrl);
                } catch (e: any) {
                    console.log(e);
                }
            }, cancelAfter);
        }

        return { order: createdLimitOrder.order, orderHash: createdLimitOrder.orderHash }
    }

    /*//////////////////////////////////////////////////////////////
                             SETTLE ORDERS
    //////////////////////////////////////////////////////////////*/

    async settleOrders(detailsToExecute: DetailsToExecute) {
        const { inputToken, inputAmount, outputToken, chainId, makerZone } = detailsToExecute;

        const {
            to: quoterTo,
            value: quoterValue,
            data: quoterData
        } = await this.quoter.generateCalldata({
            inputToken: outputToken,
            inputAmount,
            outputToken: inputToken,
            chainId,
            fromAddress: this.vaultContract || this.wallet.address
        });

        // Construct preCalldata
        const preCalldata: any[] = [];
        if (quoterTo != this.vaultContract && quoterTo != this.wallet.address && quoterTo != "") {

            // Approve zone
            preCalldata.push({
                to: inputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    makerZone, parseEther("100000")
                ])
            });

            // Approve quoter
            preCalldata.push({
                to: outputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    quoterTo, parseEther("100000")
                ])
            });

            // Perform swap
            preCalldata.push({ to: quoterTo, value: quoterValue, data: quoterData });
        }

        /*//////////////////////////////////////////////////////////////
                                    SEND TX
        //////////////////////////////////////////////////////////////*/

        if (await settleOrdersViaVault(this.wallet, detailsToExecute, {
            gasLimit: this.gasLimit,
            preSwapInstructions: preCalldata || [],
            postSwapInstructions: []
        })) {
            console.log(`Successfully sent transaction`);
        } else {
            console.log(`Failed to send transaction`);
        }
    }

    async terminate() {
        await this.feed.terminate();
    }

}