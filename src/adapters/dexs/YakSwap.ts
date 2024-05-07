import { staticCall } from "../../providers";
import { YakRouter__factory } from "../../types/factories/adapters/YakRouter__factory";
import { PriceRequest, Quoter } from "../Quoter";
import { YakRouter } from "../../types/adapters/YakRouter";


export class YakSwapQuoter implements Quoter {
    routerContractAddress: string;

    name() {
        return "YakSwap";
    }

    constructor({ routerContractAddress }: { routerContractAddress: string }) {
        this.routerContractAddress = routerContractAddress;
    }

    static build({ routerContractAddress }: { routerContractAddress: string }) {
        return new YakSwapQuoter({ routerContractAddress });
    }

    async getOutputAmountQuote({ inputToken, outputToken, inputAmount, chainId, fromAddress }: PriceRequest) {
        const output = await staticCall({
            to: this.routerContractAddress,
            data: YakRouter__factory.createInterface().encodeFunctionData("findBestPath", [
                inputAmount ? BigInt(inputAmount) : 0n,
                inputToken,
                outputToken,
                2,
            ]),
            chainId
        });

        const result = await YakRouter__factory.createInterface().decodeFunctionResult(
            "findBestPath",
            output
          );
          
          console.log("Result from findBestPath:", result);
          
          if (result.length !== 1) {
            console.error("Unexpected result format from findBestPath. Expected a single element, got:", result.length);
            console.error("Result:", result);
            throw new Error(`Unexpected result format from findBestPath. Expected a single element, got: ${result.length}`);
          }
          
          const [innerResult] = result;
          
          if (innerResult.length !== 4) {
            console.error("Unexpected inner result format from findBestPath. Expected 4 elements, got:", innerResult.length);
            console.error("Inner result:", innerResult);
            throw new Error(`Unexpected inner result format from findBestPath. Expected 4 elements, got: ${innerResult.length}`);
          }
          
          const [amountsResult, adaptersResult, pathResult, gasEstimateResult] = innerResult;
          
          if (
            !Array.isArray(amountsResult) ||
            !Array.isArray(adaptersResult) ||
            !Array.isArray(pathResult) ||
            typeof gasEstimateResult !== "bigint"
          ) {
            console.error("Invalid inner result format from findBestPath:");
            console.error("amountsResult:", amountsResult);
            console.error("adaptersResult:", adaptersResult);
            console.error("pathResult:", pathResult);
            console.error("gasEstimateResult:", gasEstimateResult);
            throw new Error("Invalid inner result format from findBestPath");
          }
          
          const amounts = amountsResult.map(BigInt);
          const adapters = adaptersResult.map(String);
          const path = pathResult.map(String);
          const gasEstimate = gasEstimateResult;
          
          const tradeStruct: YakRouter.TradeStruct = {
            amountIn: amounts[0],
            amountOut: amounts[amounts.length - 1],
            path: path,
            adapters: adapters
          };
          
          return {
            to: this.routerContractAddress,
            value: 0,
            data: YakRouter__factory.createInterface().encodeFunctionData("swapNoSplit", [
              tradeStruct,
              fromAddress,
              0n
            ]),
            outputAmount: amounts[amounts.length - 1],
            price: 0,
            gas: gasEstimate
          };
    }

    async getInputAmountQuote({ inputToken, outputToken, outputAmount, fromAddress }: PriceRequest) {
        throw new Error("Not implemented");

        return {
            outputAmount: BigInt(0),
            to: "",
            value: 0,
            data: "",
            price: 0,
            gas: BigInt(0)
        }
    }
}