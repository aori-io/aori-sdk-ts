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

export declare namespace CreateX {
  export type ValuesStruct = {
    constructorAmount: BigNumberish;
    initCallAmount: BigNumberish;
  };

  export type ValuesStructOutput = [
    constructorAmount: bigint,
    initCallAmount: bigint
  ] & { constructorAmount: bigint; initCallAmount: bigint };
}

export interface CREATEXInterface extends Interface {
  getFunction(
    nameOrSignature:
      | "computeCreate2Address(bytes32,bytes32)"
      | "computeCreate2Address(bytes32,bytes32,address)"
      | "computeCreate3Address(bytes32,address)"
      | "computeCreate3Address(bytes32)"
      | "computeCreateAddress(uint256)"
      | "computeCreateAddress(address,uint256)"
      | "deployCreate"
      | "deployCreate2(bytes32,bytes)"
      | "deployCreate2(bytes)"
      | "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256),address)"
      | "deployCreate2AndInit(bytes,bytes,(uint256,uint256))"
      | "deployCreate2AndInit(bytes,bytes,(uint256,uint256),address)"
      | "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256))"
      | "deployCreate2Clone(bytes32,address,bytes)"
      | "deployCreate2Clone(address,bytes)"
      | "deployCreate3(bytes)"
      | "deployCreate3(bytes32,bytes)"
      | "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256))"
      | "deployCreate3AndInit(bytes,bytes,(uint256,uint256))"
      | "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256),address)"
      | "deployCreate3AndInit(bytes,bytes,(uint256,uint256),address)"
      | "deployCreateAndInit(bytes,bytes,(uint256,uint256))"
      | "deployCreateAndInit(bytes,bytes,(uint256,uint256),address)"
      | "deployCreateClone"
  ): FunctionFragment;

  getEvent(
    nameOrSignatureOrTopic:
      | "ContractCreation(address,bytes32)"
      | "ContractCreation(address)"
      | "Create3ProxyContractCreation"
  ): EventFragment;

  encodeFunctionData(
    functionFragment: "computeCreate2Address(bytes32,bytes32)",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "computeCreate2Address(bytes32,bytes32,address)",
    values: [BytesLike, BytesLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "computeCreate3Address(bytes32,address)",
    values: [BytesLike, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "computeCreate3Address(bytes32)",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "computeCreateAddress(uint256)",
    values: [BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "computeCreateAddress(address,uint256)",
    values: [AddressLike, BigNumberish]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2(bytes32,bytes)",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2(bytes)",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256),address)",
    values: [BytesLike, BytesLike, BytesLike, CreateX.ValuesStruct, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2AndInit(bytes,bytes,(uint256,uint256))",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2AndInit(bytes,bytes,(uint256,uint256),address)",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256))",
    values: [BytesLike, BytesLike, BytesLike, CreateX.ValuesStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2Clone(bytes32,address,bytes)",
    values: [BytesLike, AddressLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate2Clone(address,bytes)",
    values: [AddressLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3(bytes)",
    values: [BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3(bytes32,bytes)",
    values: [BytesLike, BytesLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256))",
    values: [BytesLike, BytesLike, BytesLike, CreateX.ValuesStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3AndInit(bytes,bytes,(uint256,uint256))",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256),address)",
    values: [BytesLike, BytesLike, BytesLike, CreateX.ValuesStruct, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreate3AndInit(bytes,bytes,(uint256,uint256),address)",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreateAndInit(bytes,bytes,(uint256,uint256))",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreateAndInit(bytes,bytes,(uint256,uint256),address)",
    values: [BytesLike, BytesLike, CreateX.ValuesStruct, AddressLike]
  ): string;
  encodeFunctionData(
    functionFragment: "deployCreateClone",
    values: [AddressLike, BytesLike]
  ): string;

  decodeFunctionResult(
    functionFragment: "computeCreate2Address(bytes32,bytes32)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeCreate2Address(bytes32,bytes32,address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeCreate3Address(bytes32,address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeCreate3Address(bytes32)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeCreateAddress(uint256)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "computeCreateAddress(address,uint256)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2(bytes32,bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2(bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256),address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2AndInit(bytes,bytes,(uint256,uint256))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2AndInit(bytes,bytes,(uint256,uint256),address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2Clone(bytes32,address,bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate2Clone(address,bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3(bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3(bytes32,bytes)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3AndInit(bytes,bytes,(uint256,uint256))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256),address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreate3AndInit(bytes,bytes,(uint256,uint256),address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreateAndInit(bytes,bytes,(uint256,uint256))",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreateAndInit(bytes,bytes,(uint256,uint256),address)",
    data: BytesLike
  ): Result;
  decodeFunctionResult(
    functionFragment: "deployCreateClone",
    data: BytesLike
  ): Result;
}

export namespace ContractCreation_address_bytes32_Event {
  export type InputTuple = [newContract: AddressLike, salt: BytesLike];
  export type OutputTuple = [newContract: string, salt: string];
  export interface OutputObject {
    newContract: string;
    salt: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace ContractCreation_address_Event {
  export type InputTuple = [newContract: AddressLike];
  export type OutputTuple = [newContract: string];
  export interface OutputObject {
    newContract: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export namespace Create3ProxyContractCreationEvent {
  export type InputTuple = [newContract: AddressLike, salt: BytesLike];
  export type OutputTuple = [newContract: string, salt: string];
  export interface OutputObject {
    newContract: string;
    salt: string;
  }
  export type Event = TypedContractEvent<InputTuple, OutputTuple, OutputObject>;
  export type Filter = TypedDeferredTopicFilter<Event>;
  export type Log = TypedEventLog<Event>;
  export type LogDescription = TypedLogDescription<Event>;
}

export interface CREATEX extends BaseContract {
  connect(runner?: ContractRunner | null): CREATEX;
  waitForDeployment(): Promise<this>;

  interface: CREATEXInterface;

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

  "computeCreate2Address(bytes32,bytes32)": TypedContractMethod<
    [salt: BytesLike, initCodeHash: BytesLike],
    [string],
    "view"
  >;

  "computeCreate2Address(bytes32,bytes32,address)": TypedContractMethod<
    [salt: BytesLike, initCodeHash: BytesLike, deployer: AddressLike],
    [string],
    "view"
  >;

  "computeCreate3Address(bytes32,address)": TypedContractMethod<
    [salt: BytesLike, deployer: AddressLike],
    [string],
    "view"
  >;

  "computeCreate3Address(bytes32)": TypedContractMethod<
    [salt: BytesLike],
    [string],
    "view"
  >;

  "computeCreateAddress(uint256)": TypedContractMethod<
    [nonce: BigNumberish],
    [string],
    "view"
  >;

  "computeCreateAddress(address,uint256)": TypedContractMethod<
    [deployer: AddressLike, nonce: BigNumberish],
    [string],
    "view"
  >;

  deployCreate: TypedContractMethod<[initCode: BytesLike], [string], "payable">;

  "deployCreate2(bytes32,bytes)": TypedContractMethod<
    [salt: BytesLike, initCode: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate2(bytes)": TypedContractMethod<
    [initCode: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256),address)": TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;

  "deployCreate2AndInit(bytes,bytes,(uint256,uint256))": TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;

  "deployCreate2AndInit(bytes,bytes,(uint256,uint256),address)": TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;

  "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256))": TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct
    ],
    [string],
    "payable"
  >;

  "deployCreate2Clone(bytes32,address,bytes)": TypedContractMethod<
    [salt: BytesLike, implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate2Clone(address,bytes)": TypedContractMethod<
    [implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate3(bytes)": TypedContractMethod<
    [initCode: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate3(bytes32,bytes)": TypedContractMethod<
    [salt: BytesLike, initCode: BytesLike],
    [string],
    "payable"
  >;

  "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256))": TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct
    ],
    [string],
    "payable"
  >;

  "deployCreate3AndInit(bytes,bytes,(uint256,uint256))": TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;

  "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256),address)": TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;

  "deployCreate3AndInit(bytes,bytes,(uint256,uint256),address)": TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;

  "deployCreateAndInit(bytes,bytes,(uint256,uint256))": TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;

  "deployCreateAndInit(bytes,bytes,(uint256,uint256),address)": TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;

  deployCreateClone: TypedContractMethod<
    [implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;

  getFunction<T extends ContractMethod = ContractMethod>(
    key: string | FunctionFragment
  ): T;

  getFunction(
    nameOrSignature: "computeCreate2Address(bytes32,bytes32)"
  ): TypedContractMethod<
    [salt: BytesLike, initCodeHash: BytesLike],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "computeCreate2Address(bytes32,bytes32,address)"
  ): TypedContractMethod<
    [salt: BytesLike, initCodeHash: BytesLike, deployer: AddressLike],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "computeCreate3Address(bytes32,address)"
  ): TypedContractMethod<
    [salt: BytesLike, deployer: AddressLike],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "computeCreate3Address(bytes32)"
  ): TypedContractMethod<[salt: BytesLike], [string], "view">;
  getFunction(
    nameOrSignature: "computeCreateAddress(uint256)"
  ): TypedContractMethod<[nonce: BigNumberish], [string], "view">;
  getFunction(
    nameOrSignature: "computeCreateAddress(address,uint256)"
  ): TypedContractMethod<
    [deployer: AddressLike, nonce: BigNumberish],
    [string],
    "view"
  >;
  getFunction(
    nameOrSignature: "deployCreate"
  ): TypedContractMethod<[initCode: BytesLike], [string], "payable">;
  getFunction(
    nameOrSignature: "deployCreate2(bytes32,bytes)"
  ): TypedContractMethod<
    [salt: BytesLike, initCode: BytesLike],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2(bytes)"
  ): TypedContractMethod<[initCode: BytesLike], [string], "payable">;
  getFunction(
    nameOrSignature: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256),address)"
  ): TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2AndInit(bytes,bytes,(uint256,uint256))"
  ): TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2AndInit(bytes,bytes,(uint256,uint256),address)"
  ): TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2AndInit(bytes32,bytes,bytes,(uint256,uint256))"
  ): TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2Clone(bytes32,address,bytes)"
  ): TypedContractMethod<
    [salt: BytesLike, implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate2Clone(address,bytes)"
  ): TypedContractMethod<
    [implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate3(bytes)"
  ): TypedContractMethod<[initCode: BytesLike], [string], "payable">;
  getFunction(
    nameOrSignature: "deployCreate3(bytes32,bytes)"
  ): TypedContractMethod<
    [salt: BytesLike, initCode: BytesLike],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256))"
  ): TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate3AndInit(bytes,bytes,(uint256,uint256))"
  ): TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate3AndInit(bytes32,bytes,bytes,(uint256,uint256),address)"
  ): TypedContractMethod<
    [
      salt: BytesLike,
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreate3AndInit(bytes,bytes,(uint256,uint256),address)"
  ): TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreateAndInit(bytes,bytes,(uint256,uint256))"
  ): TypedContractMethod<
    [initCode: BytesLike, data: BytesLike, values: CreateX.ValuesStruct],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreateAndInit(bytes,bytes,(uint256,uint256),address)"
  ): TypedContractMethod<
    [
      initCode: BytesLike,
      data: BytesLike,
      values: CreateX.ValuesStruct,
      refundAddress: AddressLike
    ],
    [string],
    "payable"
  >;
  getFunction(
    nameOrSignature: "deployCreateClone"
  ): TypedContractMethod<
    [implementation: AddressLike, data: BytesLike],
    [string],
    "payable"
  >;

  getEvent(
    key: "ContractCreation(address,bytes32)"
  ): TypedContractEvent<
    ContractCreation_address_bytes32_Event.InputTuple,
    ContractCreation_address_bytes32_Event.OutputTuple,
    ContractCreation_address_bytes32_Event.OutputObject
  >;
  getEvent(
    key: "ContractCreation(address)"
  ): TypedContractEvent<
    ContractCreation_address_Event.InputTuple,
    ContractCreation_address_Event.OutputTuple,
    ContractCreation_address_Event.OutputObject
  >;
  getEvent(
    key: "Create3ProxyContractCreation"
  ): TypedContractEvent<
    Create3ProxyContractCreationEvent.InputTuple,
    Create3ProxyContractCreationEvent.OutputTuple,
    Create3ProxyContractCreationEvent.OutputObject
  >;

  filters: {
    "ContractCreation(address,bytes32)": TypedContractEvent<
      ContractCreation_address_bytes32_Event.InputTuple,
      ContractCreation_address_bytes32_Event.OutputTuple,
      ContractCreation_address_bytes32_Event.OutputObject
    >;
    "ContractCreation(address)": TypedContractEvent<
      ContractCreation_address_Event.InputTuple,
      ContractCreation_address_Event.OutputTuple,
      ContractCreation_address_Event.OutputObject
    >;

    "Create3ProxyContractCreation(address,bytes32)": TypedContractEvent<
      Create3ProxyContractCreationEvent.InputTuple,
      Create3ProxyContractCreationEvent.OutputTuple,
      Create3ProxyContractCreationEvent.OutputObject
    >;
    Create3ProxyContractCreation: TypedContractEvent<
      Create3ProxyContractCreationEvent.InputTuple,
      Create3ProxyContractCreationEvent.OutputTuple,
      Create3ProxyContractCreationEvent.OutputObject
    >;
  };
}