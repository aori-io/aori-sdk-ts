import { parseEther, Wallet } from "ethers";
import { AoriDataProvider, AoriHttpProvider, AoriPricingProvider, AoriSolutionStore, createAndMakeOrder, getTokenAllowance, settleOrdersViaVault } from "../providers";
import { AoriFeedProvider } from "../providers/AoriFeedProvider";
import { ERC20__factory } from "../types";
import { AORI_FEED, AORI_HTTP_API, AORI_TAKER_API, calldataToSettleOrders, encodeInstructions, getDefaultZone, sendOrRetryTransaction, SubscriptionEvents } from "../utils";

export class BaseMaker extends AoriHttpProvider {

    initialised = false;
    feed: AoriFeedProvider = null as any;
    dataProvider = new AoriDataProvider();
    pricingProvider = new AoriPricingProvider();
    solutionStore = new AoriSolutionStore();

    protocolAllowances: { [token: string]: boolean } = {};

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

    async initialise({ cancelAllFirst = false, gasLimit = 5_000_000n }: {
        cancelAllFirst?: boolean,
        gasLimit?: bigint
    }) {

        console.log("Initialising maker...");

        if (cancelAllFirst) {
            try {
                await this.cancelAllOrders();
            } catch (e: any) {
                console.log(e);
            }
        }

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
            chainId: this.defaultChainId,
            ...(cancelAfter != undefined) ? { endTime: Math.ceil((Date.now() + cancelAfter) / 1000) } : {},
        }, this.apiUrl);

        /*//////////////////////////////////////////////////////////////
                                SET PRECALLDATA
        //////////////////////////////////////////////////////////////*/

        // if we don't have enough allowance, approve
        if (this.protocolAllowances[outputToken] == undefined) {
            console.log(`👮 Checking approval for ${createdLimitOrder.offerer} by spender ${createdLimitOrder.inputZone} on chain ${createdLimitOrder.inputChainId}`);
            if (await getTokenAllowance(createdLimitOrder.inputChainId, createdLimitOrder.offerer, outputToken, createdLimitOrder.inputZone) < amountForUser) {
                console.log(`✍️ Approving ${createdLimitOrder.offerer} for ${createdLimitOrder.inputZone} on chain ${createdLimitOrder.inputChainId}`);
                preCalldata.push({
                    to: outputToken,
                    value: 0,
                    data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                        createdLimitOrder.inputZone, parseEther("100000")
                    ])
                });
            } else {
                console.log(`☑️ Already approved ${createdLimitOrder.offerer} for ${createdLimitOrder.inputZone} on chain ${createdLimitOrder.inputChainId}`);
            }

            this.protocolAllowances[outputToken] = true;
        }

        /*//////////////////////////////////////////////////////////////
                                SAVE SOLUTION
        //////////////////////////////////////////////////////////////*/

        if (this.vaultContract) {
            this.preCalldata[createdLimitOrder.orderHash] = preCalldata;
            this.postCalldata[createdLimitOrder.orderHash] = postCalldata;
        } else {
            // Just approve now
            for (const preCalls of preCalldata) {
                await sendOrRetryTransaction(this.wallet, { ...preCalls, chainId: this.defaultChainId });
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