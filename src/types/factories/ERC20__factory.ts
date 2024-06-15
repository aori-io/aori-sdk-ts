/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import {
  Contract,
  ContractFactory,
  ContractTransactionResponse,
  Interface,
} from "ethers";
import type {
  Signer,
  BigNumberish,
  ContractDeployTransaction,
  ContractRunner,
} from "ethers";
import type { NonPayableOverrides } from "../common";
import type { ERC20, ERC20Interface } from "../ERC20";

const _abi = [
  {
    inputs: [
      {
        internalType: "string",
        name: "_name",
        type: "string",
      },
      {
        internalType: "string",
        name: "symbol_",
        type: "string",
      },
      {
        internalType: "uint8",
        name: "_decimals",
        type: "uint8",
      },
    ],
    stateMutability: "nonpayable",
    type: "constructor",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Approval",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "Transfer",
    type: "event",
  },
  {
    inputs: [],
    name: "DOMAIN_SEPARATOR",
    outputs: [
      {
        internalType: "bytes32",
        name: "",
        type: "bytes32",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "allowance",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "approve",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "balanceOf",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decimals",
    outputs: [
      {
        internalType: "uint8",
        name: "",
        type: "uint8",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "name",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "",
        type: "address",
      },
    ],
    name: "nonces",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "owner",
        type: "address",
      },
      {
        internalType: "address",
        name: "spender",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "value",
        type: "uint256",
      },
      {
        internalType: "uint256",
        name: "deadline",
        type: "uint256",
      },
      {
        internalType: "uint8",
        name: "v",
        type: "uint8",
      },
      {
        internalType: "bytes32",
        name: "r",
        type: "bytes32",
      },
      {
        internalType: "bytes32",
        name: "s",
        type: "bytes32",
      },
    ],
    name: "permit",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "symbol",
    outputs: [
      {
        internalType: "string",
        name: "",
        type: "string",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transfer",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "from",
        type: "address",
      },
      {
        internalType: "address",
        name: "to",
        type: "address",
      },
      {
        internalType: "uint256",
        name: "amount",
        type: "uint256",
      },
    ],
    name: "transferFrom",
    outputs: [
      {
        internalType: "bool",
        name: "",
        type: "bool",
      },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const _bytecode =
  "0x60e0604090808252346200043c57620012dc803803809162000022828562000441565b833981016060828203126200043c5781516001600160401b0393908481116200043c57826200005391850162000465565b92602092838201518681116200043c5783916200007291840162000465565b91015160ff811681036200043c578451948686116200042657600095806200009b8854620004dc565b92601f93848111620003d5575b5087908483116001146200036d57899262000361575b50508160011b916000199060031b1c19161786555b8251908782116200034d578190600194620000ef8654620004dc565b828111620002f8575b50879183116001146200029457889262000288575b5050600019600383901b1c191690831b1782555b6080524660a052815184549181866200013a85620004dc565b92838352878301958882821691826000146200026857505060011462000228575b506200016a9250038262000441565b519020928151928301937f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f8552828401527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608401524660808401523060a084015260a0835260c08301948386109086111762000214575083905251902060c052610dc290816200051a823960805181610723015260a05181610bb4015260c05181610bdb0152f35b634e487b7160e01b81526041600452602490fd5b8791508880528189209089915b8583106200024f5750506200016a9350820101386200015b565b8054838801850152869450899390920191810162000235565b60ff191688526200016a95151560051b85010192503891506200015b9050565b0151905038806200010d565b8589528789208694509190601f1984168a5b8a828210620002e15750508411620002c7575b505050811b01825562000121565b015160001960f88460031b161c19169055388080620002b9565b8385015186558997909501949384019301620002a6565b909192508589528789208380860160051c8201928a871062000343575b91869589929594930160051c01915b82811062000334575050620000f8565b8b815586955088910162000324565b9250819262000315565b634e487b7160e01b87526041600452602487fd5b015190503880620000be565b898052888a209250601f1984168a5b8a828210620003be575050908460019594939210620003a4575b505050811b018655620000d3565b015160001960f88460031b161c1916905538808062000396565b60018596829396860151815501950193016200037c565b9091508880528789208480850160051c8201928a86106200041c575b9085949392910160051c01905b8181106200040d5750620000a8565b8a8155849350600101620003fe565b92508192620003f1565b634e487b7160e01b600052604160045260246000fd5b600080fd5b601f909101601f19168101906001600160401b038211908210176200042657604052565b919080601f840112156200043c578251906001600160401b038211620004265760405191602091620004a1601f8301601f191684018562000441565b8184528282870101116200043c5760005b818110620004c857508260009394955001015290565b8581018301518482018401528201620004b2565b90600182811c921680156200050e575b6020831014620004f857565b634e487b7160e01b600052602260045260246000fd5b91607f1691620004ec56fe6080604081815260048036101561001557600080fd5b600092833560e01c90816306fdde031461093b57508063095ea7b3146108a157806318160ddd1461086457806323b872dd14610747578063313ce567146106eb5780633644e515146106a957806370a08231146106475780637ecebe00146105e557806395d89b41146104ca578063a9059cbb1461041d578063d505accf1461011d5763dd62ed3e146100a757600080fd5b3461011957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126101195760209282916100e2610b28565b6100ea610b50565b9173ffffffffffffffffffffffffffffffffffffffff8092168452865283832091168252845220549051908152f35b8280fd5b509190346104195760e07ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261041957610157610b28565b90610160610b50565b91604435606435926084359260ff8416809403610415574285106103b857610186610baf565b9573ffffffffffffffffffffffffffffffffffffffff8092169586895260209560058752848a209889549960018b01905585519285898501957f6e71edae12b1b97f4d1f60370fef10105fa2faae0126114a169c64845d6126c987528b89870152169a8b606086015288608086015260a085015260c084015260c0835260e0830167ffffffffffffffff948482108683111761038b57818852845190206101008501927f19010000000000000000000000000000000000000000000000000000000000008452610102860152610122850152604281526101608401948186109086111761035f57848752519020835261018082015260a4356101a082015260c4356101c0909101528780528490889060809060015afa1561035557865116968715158061034c575b156102f15786977f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b9259596975283528087208688528352818188205551908152a380f35b8360649251917f08c379a0000000000000000000000000000000000000000000000000000000008352820152600e60248201527f494e56414c49445f5349474e45520000000000000000000000000000000000006044820152fd5b508488146102ae565b81513d88823e3d90fd5b60248c60418f7f4e487b7100000000000000000000000000000000000000000000000000000000835252fd5b5060248c60418f7f4e487b7100000000000000000000000000000000000000000000000000000000835252fd5b60648860208451917f08c379a0000000000000000000000000000000000000000000000000000000008352820152601760248201527f5045524d49545f444541444c494e455f455850495245440000000000000000006044820152fd5b8680fd5b5080fd5b50503461041957807ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261041957602091610458610b28565b8273ffffffffffffffffffffffffffffffffffffffff6024359233855260038752828520610487858254610b73565b90551692838152600386522081815401905582519081527fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef843392a35160018152f35b50503461041957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc3601126104195780519082600180549161050c836109ff565b8086529282811690811561059f5750600114610543575b5050506105358261053f940383610a52565b5191829182610ac2565b0390f35b94508085527fb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf65b8286106105875750505061053582602061053f9582010194610523565b8054602087870181019190915290950194810161056a565b61053f9750869350602092506105359491507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff001682840152151560051b82010194610523565b5050346104195760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610419578060209273ffffffffffffffffffffffffffffffffffffffff610637610b28565b1681526005845220549051908152f35b5050346104195760207ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610419578060209273ffffffffffffffffffffffffffffffffffffffff610699610b28565b1681526003845220549051908152f35b50503461041957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610419576020906106e4610baf565b9051908152f35b50503461041957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610419576020905160ff7f0000000000000000000000000000000000000000000000000000000000000000168152f35b5091346108615760607ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261086157610780610b28565b7fddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef6107a9610b50565b946044358573ffffffffffffffffffffffffffffffffffffffff80951694858752602098848a958652838920338a52865283892054857fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff820361083e575b5050508688526003855282882061081f858254610b73565b9055169586815260038452208181540190558551908152a35160018152f35b61084791610b73565b90888a528652838920338a52865283892055388085610807565b80fd5b50503461041957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610419576020906002549051908152f35b503461011957817ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc360112610119576020926108db610b28565b9183602435928392338252875273ffffffffffffffffffffffffffffffffffffffff8282209516948582528752205582519081527f8c5be1e5ebec7d5bd14f71427d1e84f3dd0314c0f7b2291e5b200ac8c7c3b925843392a35160018152f35b8490843461011957827ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc36011261011957828054610978816109ff565b8085529160019180831690811561059f57506001146109a3575050506105358261053f940383610a52565b80809650527f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5635b8286106109e75750505061053582602061053f9582010194610523565b805460208787018101919091529095019481016109ca565b90600182811c92168015610a48575b6020831014610a1957565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052602260045260246000fd5b91607f1691610a0e565b90601f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0910116810190811067ffffffffffffffff821117610a9357604052565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052604160045260246000fd5b60208082528251818301819052939260005b858110610b14575050507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe0601f8460006040809697860101520116010190565b818101830151848201604001528201610ad4565b6004359073ffffffffffffffffffffffffffffffffffffffff82168203610b4b57565b600080fd5b6024359073ffffffffffffffffffffffffffffffffffffffff82168203610b4b57565b91908203918211610b8057565b7f4e487b7100000000000000000000000000000000000000000000000000000000600052601160045260246000fd5b6000467f000000000000000000000000000000000000000000000000000000000000000003610bfd57507f000000000000000000000000000000000000000000000000000000000000000090565b60405181548291610c0d826109ff565b8082528160209485820194600190878282169182600014610d50575050600114610cf7575b50610c3f92500382610a52565b51902091604051918201927f8b73c3c69bb8fe3d512ecc4cf759cc79239f7b179b0ffacaa9a75d522b39400f845260408301527fc89efdaa54c0f20c7adf612882df0950f5a951637e0307cdcb4c672f298b8bc660608301524660808301523060a083015260a0825260c082019082821067ffffffffffffffff831117610cca575060405251902090565b807f4e487b7100000000000000000000000000000000000000000000000000000000602492526041600452fd5b87805286915087907f290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e5635b858310610d38575050610c3f935082010138610c32565b80548388018501528694508893909201918101610d21565b7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff00168852610c3f95151560051b8501019250389150610c32905056fea2646970667358221220000be17422f3d3c1627ef36ee19506ddfec6a445292f54efd37791536216bd0e64736f6c63430008130033";

type ERC20ConstructorParams =
  | [signer?: Signer]
  | ConstructorParameters<typeof ContractFactory>;

const isSuperArgs = (
  xs: ERC20ConstructorParams
): xs is ConstructorParameters<typeof ContractFactory> => xs.length > 1;

export class ERC20__factory extends ContractFactory {
  constructor(...args: ERC20ConstructorParams) {
    if (isSuperArgs(args)) {
      super(...args);
    } else {
      super(_abi, _bytecode, args[0]);
    }
  }

  override getDeployTransaction(
    _name: string,
    symbol_: string,
    _decimals: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ): Promise<ContractDeployTransaction> {
    return super.getDeployTransaction(
      _name,
      symbol_,
      _decimals,
      overrides || {}
    );
  }
  override deploy(
    _name: string,
    symbol_: string,
    _decimals: BigNumberish,
    overrides?: NonPayableOverrides & { from?: string }
  ) {
    return super.deploy(_name, symbol_, _decimals, overrides || {}) as Promise<
      ERC20 & {
        deploymentTransaction(): ContractTransactionResponse;
      }
    >;
  }
  override connect(runner: ContractRunner | null): ERC20__factory {
    return super.connect(runner) as ERC20__factory;
  }

  static readonly bytecode = _bytecode;
  static readonly abi = _abi;
  static createInterface(): ERC20Interface {
    return new Interface(_abi) as ERC20Interface;
  }
  static connect(address: string, runner?: ContractRunner | null): ERC20 {
    return new Contract(address, _abi, runner) as unknown as ERC20;
  }
}