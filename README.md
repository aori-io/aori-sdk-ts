# Aori TypeScript SDK

This repository contains all the code required to locally install and run the Aori SDK. 
This repo was designed such that integrations for our partners can be as smooth and seamless as possible, providing all the necessary abstractions to allow anyone to easily start building on top of the Aori Protocol.
If you have any further questions, refer to [the technical documentation](https://www.aori.io/developers).
Alternatively, please reach out to us [on Discord](https://discord.gg/K37wkh2ZfR) or [on Twitter](https://twitter.com/aori_io).

Contained within this SDK are the following utilities:
- Types: All custom types used within the Protocol
- Provider: AoriProvider class allows for connection to the protocol and includes class extensions OrderbookListener and LimitOrderManager
- Dynamic Order Hashing: Utilizes EIP-712 standard for generating typed data hashes for orders + OrderHasher class for deriving unique order hashes

This SDK is released under the [MIT License](LICENSE).

## Table of Contents
- [Installation](#Installation)
  - [Initialization](#Initialization)
  - [Websockets](#Websockets)
- [Useful Functions](#UsefulFunctions)
  - [CreateLimitOrder](#CreateLimitOrder)

# Installation

To install the SDK, run the following command:

```bash
npm install @aori-io/sdk
```

Or using Yarn:

```bash
yarn add @aori-io/sdk
```

## Initialization

After installation, use the following import command interact with the SDK:

```typescript
import * as AoriSDK from '@aori-io/sdk';
```
Then access specific functions like so:
```typescript
const formattedLimitOrder = AoriSDK.formatIntoLimitOrder();
```

## Websockets

Firstly if the ws package is not installed, do so by running

```bash
npm install ws
```
then importing it into the script using the following

```typescript
import { WebSocket } from 'ws';
```
After this is done, you can connect to the Aori API via the endpoints:

```typescript
const actionsWebsocket = new WebSocket('wss://api.beta.order.aori.io');
const subscriptionsWebsocket = new WebSocket('wss://api.beta.order.aori.io');
```
Note that you'll need two variables to interact with the limitOrderManager class.

# Useful Functions

Here we'll go over a few quick examples of how to interact with the main functions of the SDK.

## CreateLimitOrder

Standard function to programmatically create and send orders to the protocol. First, we'll create a class
object that we can control our transactions from.

```typescript
class OrderExecutor extends AoriSDK.LimitOrderManager {
    private executorWallet: Wallet;
    private chainId: number;

    constructor(
        executorWallet: Wallet,
        chainId: number = 5,
    ){
        super(
            actionsWebsocket,
            subscriptionsWebsocket,
            executorWallet as any,
            provider,
            apiKey);
        
        this.executorWallet = executorWallet;    
        this.chainId = chainId;
    }
```
```typescript
executorWallet
```
will be the wallet that creates signatures and interacts with the chain.
Note that ```chainId``` is set to 5 as we're using the Goerli testnet.

Now we can write a function that takes the relevant inputs, formats them into a limit order and sends it to the API.

```typescript
async createOrder(sellToken: string, buyToken: string) {
        const offerer = executorWallet.address;
        const inputToken = sellToken;
        const inputAmount = '1000000000000000000'; // Selling 1 unit of token A
        const outputToken = buyToken;
        const outputAmount = '1000000000000000000'; // Buying 1 unit of token B
        const chainId = this.chainId

        const order = await AoriSDK.formatIntoLimitOrder({
                offerer,
                inputToken,
                inputAmount,
                outputToken,
                outputAmount,
                chainId,
                provider
                }
            )
        // taking all our arguments and calling the format function to create an order that's ready to send

        order.signature = await AoriSDK.signOrder(executorWallet as any, order, chainId); // adding a signature to the order
        await this.makeOrder({ order: order, chainId: chainId }); // sending the order to the API
    }
```
