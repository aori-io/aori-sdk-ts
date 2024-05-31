import { parseEther } from "ethers";
import { AoriDataProvider, AoriHttpProvider, AoriPricingProvider, createAndMakeOrder, settleOrdersViaVault } from "../providers";
import { AoriFeedProvider } from "../providers/AoriFeedProvider";
import { ERC20__factory } from "../types";
import { AORI_FEED, AORI_HTTP_API, AORI_TAKER_API, sendOrRetryTransaction, SubscriptionEvents } from "../utils";

export class BaseMaker extends AoriHttpProvider {

    initialised = false;
    feed: AoriFeedProvider = null as any;
    dataProvider = new AoriDataProvider();
    pricingProvider = new AoriPricingProvider();

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    preCalldata: { [orderHash: string]: { to: string, value: number, data: string }[] } = {};
    postCalldata: { [orderHash: string]: { to: string, value: number, data: string }[] } = {};

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
    }: ConstructorParameters<typeof AoriHttpProvider>[0] & {
        feedUrl?: string,
    }) {
        super({ wallet, apiUrl, takerUrl, vaultContract, apiKey, defaultChainId, seatId });

        this.feed = new AoriFeedProvider({ feedUrl });

        this.feed.on("ready", () => {
            this.emit("ready");
        });
    }

    async initialise({ gasLimit = 5_000_000n }: {
        gasLimit?: bigint
    }) {

        console.log("Initialising maker...");

        this.feed.on(SubscriptionEvents.OrderToExecute, async (detailsToExecute) => {
            const { makerOrderHash, takerOrderHash, to, value, data, chainId } = detailsToExecute;

            if (!this.preCalldata[makerOrderHash]) return;
            console.log(`📦 Received an Order-To-Execute:`, { makerOrderHash, takerOrderHash, to, value, data, chainId });

            /*//////////////////////////////////////////////////////////////
                                        SEND TX
            //////////////////////////////////////////////////////////////*/

            if (await settleOrdersViaVault(this.wallet, detailsToExecute, {
                gasLimit,
                preSwapInstructions: this.preCalldata[makerOrderHash] || [],
                postSwapInstructions: this.postCalldata[makerOrderHash] || []
            })) {
                console.log(`Successfully sent transaction`);
            } else {
                console.log(`Failed to send transaction`);
            }

            /*//////////////////////////////////////////////////////////////
                                        CLEAN UP
            //////////////////////////////////////////////////////////////*/

            // @ts-ignore
            this.preCalldata[makerOrderHash] = undefined;
            // @ts-ignore
            this.postCalldata[makerOrderHash] = undefined;
        });

        this.initialised = true;
    }

    async generateQuoteOrder({
        inputToken,
        outputToken,
        inputAmount,
        outputAmount: amountForUser, // this is for the user
        cancelAfter,
        preCalldata = [],
        postCalldata = [],
        settleTx = true
    }: {
        inputToken: string;
        outputToken: string;
        inputAmount: bigint;
        outputAmount: bigint;
        cancelAfter?: number,
        preCalldata?: { to: string, value: number, data: string }[],
        postCalldata?: { to: string, value: number, data: string }[],
        settleTx?: boolean
    }) {
        if (!this.initialised) {
            throw new Error(`Maker not initialised - please call initialise() first`);
        }

        const createdLimitOrder = await createAndMakeOrder(this.wallet, {
            offerer: this.vaultContract || this.wallet.address,
            inputToken: outputToken,
            outputToken: inputToken,
            inputAmount,
            outputAmount: amountForUser,
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

        /*//////////////////////////////////////////////////////////////
                                SET PRECALLDATA
        //////////////////////////////////////////////////////////////*/

        // Approve protocol
        preCalldata.push({
            to: outputToken,
            value: 0,
            data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                createdLimitOrder.inputZone, parseEther("100000")
            ])
        });

        /*//////////////////////////////////////////////////////////////
                                SAVE SOLUTION
        //////////////////////////////////////////////////////////////*/

        if (this.vaultContract) {
            this.preCalldata[createdLimitOrder.orderHash] = preCalldata;
            this.postCalldata[createdLimitOrder.orderHash] = postCalldata;
        } else {
            // Just approve now
            for (const preCalls of preCalldata) {
                sendOrRetryTransaction(this.wallet, { ...preCalls, chainId: this.defaultChainId }).catch(console.error);
            }

            if (settleTx) {
                this.preCalldata[createdLimitOrder.orderHash] = [];
                this.postCalldata[createdLimitOrder.orderHash] = [];
            }
        }

        return { order: createdLimitOrder.order, orderHash: createdLimitOrder.orderHash }
    }

    async subscribe() {
        await this.feed.subscribe();
    }

    async terminate() {
        await this.feed.terminate();
    }
}