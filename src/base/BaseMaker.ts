import { parseEther, Wallet } from "ethers";
import { AoriDataProvider, AoriHttpProvider, AoriPricingProvider, AoriSolutionStore } from "../providers";
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
    }: {
        wallet: Wallet,
        apiKey: string,
        apiUrl?: string,
        takerUrl?: string,
        feedUrl?: string,
        vaultContract?: string,

        defaultChainId?: number
        seatId?: number
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
            const { matching, matchingSignature, makerOrderHash, takerOrderHash, to, value, data, chainId } = detailsToExecute;

            if (!this.preCalldata[makerOrderHash]) return;
            console.log(`📦 Received an Order-To-Execute:`, { makerOrderHash, takerOrderHash, to, value, data, chainId });

            /*//////////////////////////////////////////////////////////////
                                        SEND TX
            //////////////////////////////////////////////////////////////*/

            try {
                if (await sendOrRetryTransaction(this.wallet, {
                    to,
                    value,
                    data: calldataToSettleOrders(matching, matchingSignature, encodeInstructions(
                        this.preCalldata[makerOrderHash] || [],
                        this.postCalldata[makerOrderHash] || []
                    )),
                    gasLimit,
                    chainId
                })) {
                    console.log(`Successfully sent transaction`);
                } else {
                    console.log(`Failed to send transaction`);
                }
            } catch (e: any) {
                console.log(e);
            }
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

        const { order, orderHash } = await this.createLimitOrder({
            inputToken: outputToken,
            inputAmount: inputAmount, // give less
            outputToken: inputToken,
            outputAmount: amountForUser
        });

        await this.makeOrder({ order });

        /*//////////////////////////////////////////////////////////////
                                SET PRECALLDATA
        //////////////////////////////////////////////////////////////*/

        // if we don't have enough allowance, approve
        const defaultZone = getDefaultZone(this.defaultChainId);
        if (this.protocolAllowances[outputToken] == undefined) {
            console.log(`👮 Checking approval for ${this.vaultContract || this.wallet.address} by spender ${defaultZone} on chain ${this.defaultChainId}`);
            if (await this.dataProvider.getTokenAllowance({
                chainId: this.defaultChainId,
                address: this.vaultContract || this.wallet.address,
                spender: defaultZone,
                token: outputToken
            }) < amountForUser) {
                console.log(`✍️ Approving ${this.vaultContract || this.wallet.address} for ${defaultZone} on chain ${this.defaultChainId}`);
                preCalldata.push({
                    to: outputToken,
                    value: 0,
                    data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                        defaultZone, parseEther("100000")
                    ])
                });
            } else {
                console.log(`☑️ Already approved ${this.vaultContract || this.wallet.address} for ${defaultZone} on chain ${this.defaultChainId}`);
            }

            this.protocolAllowances[outputToken] = true;
        }

        /*//////////////////////////////////////////////////////////////
                                SAVE SOLUTION
        //////////////////////////////////////////////////////////////*/

        if (this.vaultContract) {
            this.preCalldata[orderHash] = preCalldata;
            this.postCalldata[orderHash] = postCalldata;
        } else {
            // Just approve now
            for (const preCalls of preCalldata) {
                await sendOrRetryTransaction(this.wallet, { ...preCalls, chainId: this.defaultChainId });
            }

            this.preCalldata[orderHash] = [];
            this.postCalldata[orderHash] = [];
        }

        /*//////////////////////////////////////////////////////////////
                                  EXPIRE ORDER
        //////////////////////////////////////////////////////////////*/

        if (cancelAfter != undefined) {
            setTimeout(async () => {
                try {
                    await this.cancelOrder(orderHash);
                } catch (e: any) {
                    console.log(e);
                }
            }, cancelAfter);
        }

        return { order, orderHash }
    }

    async subscribe() {
        await this.feed.subscribe();
    }

    async terminate() {
        await this.feed.terminate();
    }
}