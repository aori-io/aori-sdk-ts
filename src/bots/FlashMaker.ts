import { Quoter } from "@aori-io/adapters";
import { parseEther } from "ethers";
import { AoriHttpProvider } from "../providers";
import { AoriVault__factory, ERC20__factory } from "../types";
import { SEAPORT_ADDRESS, SubscriptionEvents } from "../utils";

export class FlashMaker extends AoriHttpProvider {

    initialised = false;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    preCalldata: { [orderHash: string]: { to: string, value: number, data: string }[] } = {};
    flashAmount: { [orderHash: string]: { token: string, amount: bigint }[] } = {};
    postCalldata: { [orderHash: string]: { to: string, value: number, data: string }[] } = {};

    /*//////////////////////////////////////////////////////////////
                               INITIALISE
    //////////////////////////////////////////////////////////////*/

    async initialise({ getGasData, cancelAllFirst = false }: {
        getGasData: ({ to, value, data, chainId }:
            { to: string, value: number, data: string, chainId: number })
            => Promise<{ gasPrice: bigint, gasLimit: bigint }>,
        cancelAllFirst?: boolean
    }) {
        if (this.vaultContract == undefined) {
            console.log(`No aori vault contract provided`);
            return;
        }

        console.log("Initialising flash maker...");

        if (cancelAllFirst) {
            try {
                await this.cancelAllOrders();
            } catch (e: any) {
                console.log(e);
            }
        }

        this.on(SubscriptionEvents.OrderToExecute, async ({ makerOrderHash: orderHash, takerOrderHash, to: aoriTo, value: aoriValue, data: aoriData, chainId }) => {
            if (!this.preCalldata[orderHash]) return;
            console.log(`📦 Received an Order-To-Execute:`, { orderHash, takerOrderHash, to: aoriTo, value: aoriValue, data: aoriData, chainId });

            /*//////////////////////////////////////////////////////////////
                                     SET TX DETAILS
            //////////////////////////////////////////////////////////////*/

            const to = this.vaultContract || "";
            const value = 0;
            const data = AoriVault__factory.createInterface().encodeFunctionData("flashExecute", [{
                tokens: this.flashAmount[orderHash].map(({ token }) => token),
                amounts: this.flashAmount[orderHash].map(({ amount }) => amount),
            }, [
                ...(this.preCalldata[orderHash] || []),
                { to: aoriTo, value: aoriValue, data: aoriData },
                ...(this.postCalldata[orderHash] || [])
            ]]);
            const { gasPrice, gasLimit } = await getGasData({ to, value, data, chainId });

            /*//////////////////////////////////////////////////////////////
                                        SEND TX
            //////////////////////////////////////////////////////////////*/

            try {
                const response = await this.sendTransaction({
                    to,
                    value,
                    data,
                    gasPrice,
                    gasLimit,
                    chainId,
                    nonce: await this.getNonce()
                });
                console.log(`Sent transaction: `, response);
            } catch (e: any) {
                console.log(e);
            }
        });

        this.initialised = true;
    }

    async generateQuoteOrder({
        inputToken,
        outputToken,
        outputAmount: amountForUser, // this is for the user
        spreadPercentage,
        quoter,
        cancelAfter
    }: {
        inputToken: string;
        outputToken: string;
        outputAmount: bigint;
        spreadPercentage: bigint;
        quoter: Quoter;
        cancelAfter?: number
    }) {
        if (!this.initialised) {
            throw new Error(`Flash maker not initialised - please call initialise() first`);
        }

        const { outputAmount, to: quoterTo, value: quoterValue, data: quoterData } = await quoter.getOutputAmountQuote({
            inputToken,
            outputToken,
            inputAmount: amountForUser.toString(),
            fromAddress: this.wallet.address,
            chainId: this.defaultChainId
        });

        const { order, orderHash } = await this.createLimitOrder({
            inputToken: outputToken,
            inputAmount: outputAmount * (10_000n - spreadPercentage) / 10_000n, // give less
            outputToken: inputToken,
            outputAmount: amountForUser
        });

        await this.makeOrder({ order });

        this.preCalldata[orderHash] = [
            {
                to: outputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    SEAPORT_ADDRESS, parseEther("100000")
                ])
            },
            {
                to: inputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    quoterTo, parseEther("100000")
                ])
            },
            {
                to: quoterTo,
                value: quoterValue,
                data: quoterData
            }];

        this.flashAmount[orderHash] = [{ token: inputToken, amount: amountForUser }];
        this.postCalldata[orderHash] = [];

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
}