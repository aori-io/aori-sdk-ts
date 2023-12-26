import { SEAPORT_CONTRACT_VERSION_V1_5 } from "@opensea/seaport-js/lib/constants";
import { ERC20__factory } from "@opensea/seaport-js/lib/typechain-types";
import { parseEther } from "ethers";
import { AoriDataProvider, AoriHttpProvider, AoriPricingProvider, AoriSolutionStore, SubscriptionEvents } from "../providers";
import { AoriVault__factory } from "../types";
import { SEAPORT_ADDRESS } from "../utils";

export class BaseMaker extends AoriHttpProvider {

    initialised = false;
    dataProvider = new AoriDataProvider();
    pricingProvider = new AoriPricingProvider();
    solutionStore = new AoriSolutionStore();

    seaportAllowances: { [token: string]: boolean } = {};

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

            /*//////////////////////////////////////////////////////////////
                                   CONSTRUCT CALLDATA
            //////////////////////////////////////////////////////////////*/

            const data = this.flashAmount[orderHash].length != 0 ?
                // Rely on a balancer flash loan
                AoriVault__factory.createInterface().encodeFunctionData("flashExecute", [{
                    tokens: this.flashAmount[orderHash].map(({ token }) => token),
                    amounts: this.flashAmount[orderHash].map(({ amount }) => amount),
                }, [
                    ...(this.preCalldata[orderHash] || []),
                    { to: aoriTo, value: aoriValue, data: aoriData },
                    ...(this.postCalldata[orderHash] || [])
                ]]) :
                // Use own liquidity / programmatic pull liquidity
                AoriVault__factory.createInterface().encodeFunctionData("execute", [[
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
        inputAmount,
        outputAmount: amountForUser, // this is for the user
        cancelAfter,
        preCalldata = [],
        flashAmount = [],
        postCalldata = [],
        settleTx = true
    }: {
        inputToken: string;
        outputToken: string;
        inputAmount: bigint;
        outputAmount: bigint;
        cancelAfter?: number,
        preCalldata?: { to: string, value: number, data: string }[],
        flashAmount?: { token: string, amount: bigint }[],
        postCalldata?: { to: string, value: number, data: string }[],
        settleTx?: boolean
    }) {
        if (!this.initialised) {
            throw new Error(`Maker not initialised - please call initialise() first`);
        }

        const order = await this.createLimitOrder({
            inputToken: outputToken,
            inputAmount: inputAmount, // give less
            outputToken: inputToken,
            outputAmount: amountForUser
        });

        const orderHash = order.orderHash;
        await this.makeOrder({ order });

        /*//////////////////////////////////////////////////////////////
                                SET PRECALLDATA
        //////////////////////////////////////////////////////////////*/

        // if we don't have enough allowance, approve
        if (this.seaportAllowances[outputToken] == undefined) {
            console.log(`👮 Checking approval for ${this.vaultContract} by spender ${SEAPORT_CONTRACT_VERSION_V1_5} on chain ${this.defaultChainId}`);
            if (await this.dataProvider.getTokenAllowance({
                chainId: this.defaultChainId,
                address: this.vaultContract || "",
                spender: SEAPORT_CONTRACT_VERSION_V1_5,
                token: outputToken
            }) < amountForUser) {
                console.log(`✍️ Approving ${this.vaultContract} for ${SEAPORT_CONTRACT_VERSION_V1_5} on chain ${this.defaultChainId}`);
                preCalldata.push({
                    to: outputToken,
                    value: 0,
                    data: ERC20__factory.createInterface().encodeFunctionData("approve", [
                        SEAPORT_ADDRESS, parseEther("100000")
                    ])
                });
            } else {
                console.log(`☑️ Already approved ${this.vaultContract} for ${SEAPORT_CONTRACT_VERSION_V1_5} on chain ${this.defaultChainId}`);
            }

            this.seaportAllowances[outputToken] = true;
        }

        /*//////////////////////////////////////////////////////////////
                                SAVE SOLUTION
        //////////////////////////////////////////////////////////////*/

        if (!settleTx) {
            await this.solutionStore.saveSolution({
                orderHash,
                chainId: this.defaultChainId,
                from: this.wallet.address,
                to: this.vaultContract || "",
                flashAmount,
                preCalldata,
                postCalldata
            });
        } else {
            this.flashAmount[orderHash] = flashAmount;
            this.preCalldata[orderHash] = preCalldata;
            this.postCalldata[orderHash] = postCalldata;
        }

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