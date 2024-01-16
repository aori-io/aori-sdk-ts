/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type {
  BaseContract,
  BigNumberish,
  BytesLike,
  FunctionFragment,
  Result,
  Interface,
  EventFragment,
  AddressLike,
  ContractRunner,
  ContractMethod,
  Listener,
} from "ethers";
import type {
  TypedContractEvent,
  TypedDeferredTopicFilter,
  TypedEventLog,
  TypedLogDescription,
  TypedListener,
  TypedContractMethod,
} from "./common";

export declare namespace IAoriV2 {
  export type OrderStruct = {
    offerer: AddressLike;
    inputToken: AddressLike;
    inputAmount: BigNumberish;
    inputChainId: BigNumberish;
    inputZone: AddressLike;
    outputToken: AddressLike;
    outputAmount: BigNumberish;
    outputChainId: BigNumberish;
    outputZone: AddressLike;
    startTime: BigNumberish;
    endTime: BigNumberish;
    salt: BigNumberish;
    counter: BigNumberish;
    toWithdraw: boolean;
  };

  export type OrderStructOutput = [
    offerer: string,
    inputToken: string,
    inputAmount: bigint,
    inputChainId: bigint,
    inputZone: string,
    outputToken: string,
    outputAmount: bigint,
    outputChainId: bigint,
    outputZone: string,
    startTime: bigint,
    endTime: bigint,
    salt: bigint,
    counter: bigint,
    toWithdraw: boolean
  ] & {
    offerer: string;
    inputToken: string;
    inputAmount: bigint;
    inputChainId: bigint;
    inputZone: string;
    outputToken: string;
    outputAmount: bigint;
    outputChainId: bigint;
    outputZone: string;
    startTime: bigint;
    endTime: bigint;
    salt: bigint;
    counter: bigint;
    toWithdraw: boolean;
  };

  export type MatchingDetailsStruct = {
    makerOrder: IAoriV2.OrderStruct;
    takerOrder: IAoriV2.OrderStruct;
    makerSignature: BytesLike;
    takerSignature: BytesLike;
    blockDeadline: BigNumberish;
    seatNumber: BigNumberish;
    seatHolder: AddressLike;
    seatPercentOfFees: BigNumberish;
  };

  export type MatchingDetailsStructOutput = [
    makerOrder: IAoriV2.OrderStructOutput,
    takerOrder: IAoriV2.OrderStructOutput,
    makerSignature: string,
    takerSignature: string,
    blockDeadline: bigint,
    seatNumber: bigint,
    seatHolder: string,
    seatPercentOfFees: bigint
  ] & {
    makerOrder: IAoriV2.OrderStructOutput;
    takerOrder: IAoriV2.OrderStructOutput;
    makerSignature: string;
    takerSignature: string;
    blockDeadline: bigint;
    seatNumber: bigint;
    seatHolder: string;
    seatPercentOfFees: bigint;
  };
}

export interface AoriV2Interface extends Interface {
  getFunction(
    nameOrSignature:
      | "balanceOf"
      | "deposit"
      | "flashLoan"
      | "getCounter"
      | "getMatchingHash"
      | "getOrderHash"
      | "hasOrderSettled"
      | "incrementCounter"
      | "setTakerFee"
      | "settleOrders"
      | "signatureIntoComponents"
      | "version"
      | "withdraw"
  ): FunctionFragment;

  getEvent(nameOrSignatureOrTopic: "OrdersSettled"): EventFragment;

  encodeFunctionData(
    functionFragment: "balanceOf",
    values: [AddressLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deposit",
    values: [AddressLike, AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "flashLoan",
    values: [AddressLike, AddressLike, BigNumberish, BytesLike, boolean]
  ): string;
  encodeFunctionData(
    functionFragment: "getCounter",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "getMatchingHash",
    values: [IAoriV2.MatchingDetailsStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "getOrderHash",
    values: [IAoriV2.OrderStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "hasOrderSettled",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "incrementCounter",
    values?: undefined
  ): string;
  encodeFunctionData(
    functionFragment: "setTakerFee",
    values: [BigNumberish, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "settleOrders",
    values: [IAoriV2.MatchingDetailsStruct, BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "signatureIntoComponents",
    values: [BytesLike]
  ): string;
  encodeFunctionData(functionFragment: "version", values?: undefined): string;
  encodeFunctionData(
    functionFragment: "withdraw",
    values: [AddressLike, BigNumberish]
  ): string;

  decodeFunctionResult(functionFragment: "balanceOf", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "deposit", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "flashLoan", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "getCounter", data: BytesLike): Result;
  decodeFunctionResult(
    functionFragment: "getMatchingHash",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "getOrderHash",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "hasOrderSettled",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "incrementCounter",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "setTakerFee",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "settleOrders",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "signatureIntoComponents",
    data: BytesLike
  ): Result;
  decodeFunctionResult(functionFragment: "version", data: BytesLike): Result;
  decodeFunctionResult(functionFragment: "withdraw", data: BytesLike): Result;
}

export namespace OrdersSettledEvent {
  export type InputTuple = [
    makerHash: BytesLike,
    takerHash: BytesLike,
    inputToken: AddressLike,
    outputToken: AddressLike,
    inputAmount: BigNumberish,
    outputAmount: BigNumberish,
    matchingHash: BytesLike
  ];
  export type OutputTuple = [
    makerHash: string,
    takerHash: string,
    inputToken: string,
    outputToken: string,
    inputAmount: bigint,
    outputAmount: bigint,
    matchingHash: string
  ];
  export interface OutputObject {
    makerHash: string;
    takerHash: string;
    inputToken: string;
    outputToken: string;
    inputAmount: bigint;
    outputAmount: bigint;
    matchingHash: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface AoriV2 extends BaseContract {
  connect(runner?: ContractRunner | null): AoriV2;
  waitForDeployment(): Promise<this>;

  interface: AoriV2Interface;

  queryFilter<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;
  queryFilter<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined
  ): Promise<Array<TypedEventLog<TCEvent>>>;

  on<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  on<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  once<TCEvent extends TypedContractEvent>(
    event: TCEvent,
    listener: TypedListener<TCEvent>
  ): Promise<this>;
  once<TCEvent extends TypedContractEvent>(
    filter: TypedDeferredTopicFilter<TCEvent>,
    listener: TypedListener<TCEvent>
  ): Promise<this>;

  listeners<TCEvent extends TypedContractEvent>(
    event: TCEvent
  ): Promise<Array<TypedListener<TCEvent>>>;
  listeners(eventName?: string): Promise<Array<Listener>>;
  removeAllListeners<TCEvent extends TypedContractEvent>(
    event?: TCEvent
  ): Promise<this>;

  balanceOf: TypedContractMethod<
    [_account: AddressLike, _token: AddressLike],
    [bigint],
    "view"
  >;

  deposit: TypedContractMethod<
    [_account: AddressLike, _token: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  flashLoan: TypedContractMethod<
    [
      recipient: AddressLike,
      token: AddressLike,
      amount: BigNumberish,
      userData: BytesLike,
      receiveToken: boolean
    ],
    [void],
    "nonpayable"
  >;

  getCounter: TypedContractMethod<[], [bigint], "view">;

  getMatchingHash: TypedContractMethod<
    [matching: IAoriV2.MatchingDetailsStruct],
    [string],
    "view"
  >;

  getOrderHash: TypedContractMethod<
    [order: IAoriV2.OrderStruct],
    [string],
    "view"
  >;

  hasOrderSettled: TypedContractMethod<
    [orderHash: BytesLike],
    [boolean],
    "view"
  >;

  incrementCounter: TypedContractMethod<[], [void], "nonpayable">;

  setTakerFee: TypedContractMethod<
    [_takerFeeBips: BigNumberish, _takerFeeAddress: AddressLike],
    [void],
    "nonpayable"
  >;

  settleOrders: TypedContractMethod<
    [
      matching: IAoriV2.MatchingDetailsStruct,
      serverSignature: BytesLike,
      options: BytesLike
    ],
    [void],
    "payable"
  >;

  signatureIntoComponents: TypedContractMethod<
    [signature: BytesLike],
    [[bigint, string, string] & { v: bigint; r: string; s: string }],
    "view"
  >;

  version: TypedContractMethod<[], [string], "view">;

  withdraw: TypedContractMethod<
    [_token: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "balanceOf"
  ): TypedContractMethod<
    [_account: AddressLike, _token: AddressLike],
    [bigint],
    "view"
  >;
  getFunction(
    nameOrSignature: "deposit"
  ): TypedContractMethod<
    [_account: AddressLike, _token: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "flashLoan"
  ): TypedContractMethod<
    [
      recipient: AddressLike,
      token: AddressLike,
      amount: BigNumberish,
      userData: BytesLike,
      receiveToken: boolean
    ],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "getCounter"
  ): TypedContractMethod<[], [bigint], "view">;
  getFunction(
    nameOrSignature: "getMatchingHash"
  ): TypedContractMethod<
    [matching: IAoriV2.MatchingDetailsStruct],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "getOrderHash"
  ): TypedContractMethod<[order: IAoriV2.OrderStruct], [string], "view">;
  getFunction(
    nameOrSignature: "hasOrderSettled"
  ): TypedContractMethod<[orderHash: BytesLike], [boolean], "view">;
  getFunction(
    nameOrSignature: "incrementCounter"
  ): TypedContractMethod<[], [void], "nonpayable">;
  getFunction(
    nameOrSignature: "setTakerFee"
  ): TypedContractMethod<
    [_takerFeeBips: BigNumberish, _takerFeeAddress: AddressLike],
    [void],
    "nonpayable"
  >;
  getFunction(
    nameOrSignature: "settleOrders"
  ): TypedContractMethod<
    [
      matching: IAoriV2.MatchingDetailsStruct,
      serverSignature: BytesLike,
      options: BytesLike
    ],
    [void],
    "payable"
  >;
  getFunction(
    nameOrSignature: "signatureIntoComponents"
  ): TypedContractMethod<
    [signature: BytesLike],
    [[bigint, string, string] & { v: bigint; r: string; s: string }],
    "view"
  >;
  getFunction(
    nameOrSignature: "version"
  ): TypedContractMethod<[], [string], "view">;
  getFunction(
    nameOrSignature: "withdraw"
  ): TypedContractMethod<
    [_token: AddressLike, _amount: BigNumberish],
    [void],
    "nonpayable"
  >;

  getEvent(
    key: "OrdersSettled"
  ): TypedContractEvent<
    OrdersSettledEvent.InputTuple,
    OrdersSettledEvent.OutputTuple,
    OrdersSettledEvent.OutputObject
  >;

  filters: {
    "OrdersSettled(bytes32,bytes32,address,address,uint256,uint256,bytes32)": TypedContractEvent<
      OrdersSettledEvent.InputTuple,
      OrdersSettledEvent.OutputTuple,
      OrdersSettledEvent.OutputObject
    >;
    OrdersSettled: TypedContractEvent<
      OrdersSettledEvent.InputTuple,
      OrdersSettledEvent.OutputTuple,
      OrdersSettledEvent.OutputObject
    >;
  };
}
