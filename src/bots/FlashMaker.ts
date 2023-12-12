import { Quoter } from "@aori-io/adapters";
import { parseEther } from "ethers";
import { AoriHttpProvider, SubscriptionEvents } from "../providers";
import { AoriVault__factory, ERC20__factory } from "../types";
import { SEAPORT_ADDRESS } from "../utils";

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

    async initialise() {
        if (this.vaultContract == undefined) {
            console.log(`No aori vault contract provided`);
            return;
        }

        console.log("Initialising flash maker...");

        this.on(SubscriptionEvents.OrderToExecute, async ({ makerOrderHash: orderHash, to, value, data }) => {
            if (!this.preCalldata[orderHash]) return;

            try {
                await this.sendTransaction({
                    to: this.vaultContract || "",
                    value: 0,
                    // @ts-ignore 
                    data: AoriVault__factory.createInterface().encodeFunctionData("flashExecute", [{
                        tokens: this.flashAmount[orderHash].map(({ token }) => token),
                        amounts: this.flashAmount[orderHash].map(({ amount }) => amount),
                    }, [
                        ...(this.preCalldata[orderHash] || []),
                        { to, value, data },
                        ...(this.postCalldata[orderHash] || [])
                    ]]),
                    gasLimit: 3_000_000
                });
                console.log(`Sent transaction: `, { to, value, data });
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
            await this.initialise();
        }

        const { outputAmount, to: quoterTo, value: quoterValue, data: quoterData } = await quoter.getOutputAmountQuote({
            inputToken,
            outputToken,
            inputAmount: amountForUser.toString(),
            fromAddress: this.wallet.address,
            chainId: this.defaultChainId
        });

        const order = await this.createLimitOrder({
            inputToken: outputToken,
            inputAmount: outputAmount * (10_000n - spreadPercentage) / 10_000n, // give less
            outputToken: inputToken,
            outputAmount: amountForUser
        });
        console.log(`Made order: `, order.parameters.offer, `for`, order.parameters.consideration);
        const orderHash = order.orderHash;

        await this.makeOrder({ order });

        this.preCalldata[orderHash] = [
            {
                to: inputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    quoterTo, parseEther("100000")
                ])
            },
            {
                to: inputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    SEAPORT_ADDRESS, parseEther("100000")
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