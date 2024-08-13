import { Wallet } from "ethers";
import { DetailsToExecute } from "./interfaces";
import { Quoter } from "./Quoter";
import { getCurrentGasInToken, RFQProvider, SubscriptionEvents } from "../providers";
import { approveTokenCall, createAndSignResponse, settleOrders, settleOrdersViaVault } from "./helpers";

export class QuoteMaker {
    wallet: Wallet;
    feedRFQ: RFQProvider;
    vaultContract?: string;
    quoter: Quoter;

    logQuotes = false;
    sponsorGas = false;
    gasLimit: bigint = 5_000_000n;
    gasPriceMultiplier: number = 1.1;
    spreadPercentage: bigint = 0n;

    constructor({
        wallet,
        feedUrl,
        quoter,
        defaultChainId = 42161,
        sponsorGas,
        gasLimit,
        gasPriceMultiplier,
        spreadPercentage
    }: {
        wallet: Wallet,
        feedUrl: string,
        quoter: Quoter,
        defaultChainId: number
        sponsorGas?: boolean,
        cancelAfter?: number,
        gasLimit?: bigint,
        gasPriceMultiplier?: number,
        spreadPercentage?: bigint,
    }) {
        /*//////////////////////////////////////////////////////////////
                                 SET PROPERTIES
        //////////////////////////////////////////////////////////////*/

        this.wallet = wallet;
        this.quoter = quoter;

        /*//////////////////////////////////////////////////////////////
                               FEED CONFIGURATION
        //////////////////////////////////////////////////////////////*/

        this.feedRFQ = new RFQProvider(feedUrl);

        this.feedRFQ.on(SubscriptionEvents.QuoteRequested, ({ rfqId, inputToken, outputToken, inputAmount, chainId, zone }) => {
            if (chainId == defaultChainId) {
                if (inputAmount == undefined || inputAmount == "0") return;
                this.generateQuote({ rfqId, inputToken, inputAmount, outputToken, chainId, zone }).catch(console.log);
            }
        });

        this.feedRFQ.on(SubscriptionEvents.CalldataToExecute, (msg) => {

        });
    }

    activeAddress() {
        return this.vaultContract || this.wallet.address;
    }

    async generateQuote({
        rfqId,
        inputToken,
        outputToken,
        inputAmount, // Amount that the user is willing to pay
        chainId,
        zone,
        retries = 3,
    }: {
        rfqId: string,
        inputToken: string;
        outputToken: string;
        inputAmount: string;
        zone: string,
        chainId: number,
        retries?: number
        sponsorGas?: boolean,
        cancelAfter?: number,
        gasLimit?: bigint,
        gasPriceMultiplier?: number,
        spreadPercentage?: bigint
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

                const { order: responseOrder, orderHash, signature: responseSignature } = await createAndSignResponse(this.wallet, {
                    offerer: this.vaultContract || "",
                    inputToken: outputToken,
                    outputToken: inputToken,
                    inputAmount: (outputAmount - gasInToken) * (10_000n - this.spreadPercentage) / 10_000n,
                    outputAmount: BigInt(inputAmount),
                    zone,
                    chainId
                });

                this.feedRFQ.respond(rfqId, {
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

    
}

