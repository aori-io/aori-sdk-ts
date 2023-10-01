import { AoriMethods, NotificationEvents, OrderToExecute, SubscriptionEvents } from "../providers";
import { ERC20, ERC20__factory } from "../types";
import { formatIntoLimitOrder, signOrder } from "../utils";
import { LimitOrderManager } from "./LimitOrderManager";

export class XYK extends LimitOrderManager {

    aTokenAddress: string = "";
    bTokenAddress: string = "";
    aToken: ERC20 = null as any;
    bToken: ERC20 = null as any;
    chainId: number = 5;

    async initialise({ chainId, aTokenAddress, bTokenAddress }: { chainId: number, aTokenAddress: string, bTokenAddress: string }): Promise<void> {
        super.initialise();

        this.aTokenAddress = aTokenAddress;
        this.bTokenAddress = bTokenAddress;
        this.chainId = chainId;
        this.aToken = ERC20__factory.connect(aTokenAddress, this.provider);
        this.bToken = ERC20__factory.connect(bTokenAddress, this.provider);

        this.on(AoriMethods.ViewOrderbook, async (orders) => {
            orders.forEach((order) => {
                this.cancelOrder(order.orderHash, this.wallet.signMessageSync(order.orderHash));
            });
        });

        this.on(SubscriptionEvents.OrderTaken, async (orderHash) => {
            if (!(orderHash in this.currentLimitOrders)) return;
            await this.refreshOrders();
        });

        this.on(NotificationEvents.OrderToExecute, async ({ contractCall: { to, value, data } }: OrderToExecute) => {
            await this.wallet.sendTransaction({ to, value, data });
        });

        // Remove prior orders
        console.log("Removing prior orders...");
        await this.viewOrderbook({ offerer: this.wallet.address, signature: this.wallet.signMessageSync(this.wallet.address) });

        // Remake new orders
        await this.refreshOrders();
    }

    /*//////////////////////////////////////////////////////////////
                                 HOOKS
    //////////////////////////////////////////////////////////////*/

    async refreshOrders(): Promise<void> {
        // Delete all orders
        Object.keys(this.currentLimitOrders).forEach((orderHash) => {
            this.cancelOrder(orderHash, this.wallet.signMessageSync(orderHash));
        });

        // Make new orders
        console.log("Making new orders...");
        const aBalance: bigint = await this.aToken.balanceOf(this.wallet.address);
        const bBalance: bigint = await this.bToken.balanceOf(this.wallet.address);
        const k = aBalance * bBalance;

        const aTokenForBToken = await formatIntoLimitOrder({
            offerer: this.wallet.address,
            inputToken: this.aTokenAddress,
            inputAmount: 1n,
            outputToken: this.bTokenAddress,
            outputAmount: k / (aBalance - 1n),
            chainId: this.chainId,
            provider: this.provider
        });
        aTokenForBToken.signature = await signOrder(this.wallet, aTokenForBToken, this.chainId);

        const bTokenForAToken = await formatIntoLimitOrder({
            offerer: this.wallet.address,
            inputToken: this.bTokenAddress,
            inputAmount: 1n,
            outputToken: this.aTokenAddress,
            outputAmount: k / (bBalance - 1n),
            chainId: this.chainId,
            provider: this.provider
        });
        bTokenForAToken.signature = await signOrder(this.wallet, bTokenForAToken, this.chainId);

        this.makeOrder({ order: aTokenForBToken, chainId: this.chainId });
        this.makeOrder({ order: bTokenForAToken, chainId: this.chainId });
    }
}