import { parseEther } from "ethers";
import { AoriHttpProvider } from "../providers";
import { AoriVault__factory, ERC20__factory } from "../types";
import { InstructionStruct } from "../types/AoriVault";
import { AORI_V2_SINGLE_CHAIN_ZONE_ADDRESS, SubscriptionEvents } from "../utils";

export class BatchMaker extends AoriHttpProvider {

    initialised = false;

    /*//////////////////////////////////////////////////////////////
                                 STATE
    //////////////////////////////////////////////////////////////*/

    preCalldata: { [orderHash: string]: InstructionStruct[] } = {};
    postCalldata: { [orderHash: string]: InstructionStruct[] } = {};

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
            const data = AoriVault__factory.createInterface().encodeFunctionData("execute", [[
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
        inputAmount: amountFromMe,
        outputAmount: amountForUser, // this is for the user
        preCalldata = [],
        postCalldata = [],
        cancelAfter
    }: {
        inputToken: string;
        outputToken: string;
        inputAmount: bigint;
        outputAmount: bigint;
        preCalldata?: InstructionStruct[],
        postCalldata?: InstructionStruct[],
        cancelAfter?: number
    }) {
        if (!this.initialised) {
            throw new Error(`Flash maker not initialised - please call initialise() first`);
        }

        const { order, orderHash } = await this.createLimitOrder({
            inputToken: outputToken,
            inputAmount: amountFromMe,
            outputToken: inputToken,
            outputAmount: amountForUser
        });

        await this.makeOrder({ order });

        this.preCalldata[orderHash] = [
            {
                to: outputToken,
                value: 0,
                data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                    AORI_V2_SINGLE_CHAIN_ZONE_ADDRESS, parseEther("100000")
                ])
            }, ...preCalldata];

        this.postCalldata[orderHash] = postCalldata;

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