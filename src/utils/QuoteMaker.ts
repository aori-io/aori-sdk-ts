import { parseEther } from "ethers";
import { AoriDataProvider, AoriFeedProvider, AoriHttpProvider, AoriPricingProvider, calculateGasInToken, createAndMakeOrder, getFeeData, settleOrdersViaVault } from "../providers";
import { ERC20__factory } from "../types";
import { AORI_FEED, AORI_HTTP_API, AORI_TAKER_API, DetailsToExecute, Quoter, SubscriptionEvents } from ".";

export class QuoteMaker extends AoriHttpProvider {

    initialised = false;
    feed: AoriFeedProvider = null as any;
    dataProvider = new AoriDataProvider();
    pricingProvider = new AoriPricingProvider();
    createdOrders = new Set<string>();
    quoter: Quoter;
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
        takerUrl = AORI_TAKER_API,
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
    }: ConstructorParameters<typeof AoriHttpProvider>[0] & {
        feedUrl?: string,
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

        super({ wallet, apiUrl, takerUrl, vaultContract, apiKey, defaultChainId, seatId });
        this.feed = new AoriFeedProvider({ feedUrl });
        this.quoter = quoter;
        this.logQuotes = logQuotes;
        this.sponsorGas = sponsorGas;
        this.gasLimit = gasLimit;
        this.spreadPercentage = spreadPercentage;

        /*//////////////////////////////////////////////////////////////
                               FEED CONFIGURATION
        //////////////////////////////////////////////////////////////*/

        this.feed.on("ready", () => {
            this.emit("ready");

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
                    await this.cancelOrder(createdLimitOrder.orderHash);
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