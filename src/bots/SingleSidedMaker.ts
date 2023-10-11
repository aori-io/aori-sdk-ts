import { LimitOrderManager } from "./LimitOrderManager";

export class SingleSidedMaker extends LimitOrderManager {

    inputToken: string = "";
    outputToken: string = "";
    chainId: number = 5;

    async initialise({ chainId, inputToken, outputToken }: { chainId: number, inputToken: string, outputToken: string }): Promise<void> {
        super.initialise({ chainId, inputToken, outputToken });

        this.inputToken = inputToken;
        this.outputToken = outputToken;
        this.chainId = chainId;
    }

    async makeOrders(quantityPrice: [string, string][]) {
        for (let [_quantity, _price] of quantityPrice) {
            const quantity = BigInt(_quantity);
            const price = BigInt(_quantity);

            await this.makeOrder({
                order: await this.createLimitOrder({
                    inputToken: this.inputToken,
                    inputAmount: quantity,
                    outputToken: this.outputToken,
                    outputAmount: price,

                }),
                chainId: this.chainId
            })
        }
    }
}
