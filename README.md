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
  - [ViewOrderbook](#ViewOrderbook)
  - [SubscribeOrderbook](#subscribeOrderbook)
  - [TakeOrder](#TakeOrder)


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

## Useful Functions

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

## View Orderbook

Used to pull all orders for a given Base/Quote pair. Returns an list of objects.

First we create a payload JSON object

```typescript
    const payload = JSON.stringify({
        "id": i,
        "jsonrpc": "2.0",
        "method": "aori_viewOrderbook",
        "params": [{
          "chainId": 5,
          "query": {
            "base": wethAddress,
            "quote": usdcAddress
          }
        }]
      });
```
Then send our payload to the API endpoint. 

```typescript
this.actionsWebsocket.send(payload);
```
This will return a list of order objects in the format:

```typescript
{
  "id": <unique_request_id>,
  "result": {
    "orders": [
      {
        // Order details
      },
      // ... more orders
    ]
  }
}
```

## SubscribeOrderbook

Alternatively, we can subscribe to the orderbook to be notified whenever a new order is posted. 
Because our ```OrderExecutor``` class inherits from ```AoriProvider``` the class object will already
be listening out for orderbook events, therefore we can access new events as soon as they
are detected by employing ```this.on()``` like so:

```typescript
this.on(SubscriptionEvents.OrderCreated, async (orderDetails) => {
        console.log(orderDetails);
    });
```
Or for cancelled orders:

```typescript
this.on(SubscriptionEvents.OrderCancelled, async (orderDetails) => {
        console.log(orderDetails);
    });
```
and so forth.

## TakeOrder

To take a specific order, the API expects an object in the following format:

```typescript
const takeOrderPayload = JSON.stringify({
  "id": i,
  "jsonrpc": "2.0",
  "method": "aori_takeOrder",
  "params": [{
    "orderId": "<order_id>",
     "order": {
      // Order details
      "parameters": {
        "offerer": "0x...", // Address of wallet who made the order
        "zone": "0x...",
        "zoneHash": "",
        "startTime": "0",
        "endTime": "10000...",
        "orderType": 3, // PARTIAL_RESTRICTED
        "offer": [{
          "itemType": 1, // ERC20
          "token": "0x...",
          "identifierOrCriteria": "0",
          "startAmount": "10000..",
          "endAmount": "10000.."
        }, ...],
        "consideration": [{
          "itemType": 1, // ERC20
          "token": "0x...",
          "identifierOrCriteria": "0",
          "startAmount": "10000..",
          "endAmount": "10000.."
          "recipient": "0x..."
        }, ...],
        "totalOriginalConsiderationItems": "100...",
        "salt": "0",
        "conduitKey": "0x...",
        "counter": "0"
      },
      "signature": <signed typed signature of order> // Using signOrder function from before
    },
    "seatId": <seat_id>, // Optional
    "apiKey": <api_key_or_jwt>
  }]
});
```
And can be called in much the same way as other functions:

```typescript
await this.actionsWebsocket.send(takeOrderPayload);
```

## CancelOrder

Orders can be cancelled via sending a signed cancelOrder object to the endpoint. 
The order must be signed by the same wallet that originally created the order.

To sign an order, we can use

```typescript
async signCancelOrder(orderId) {
        const signature = this.wallet.signMessageSync(orderId);
        return signature
    }
```

in order to create the object:

```typescript
const cancelOrderObject = JSON.stringify({
  "id": i,
  "jsonrpc": "2.0",
  "method": "aori_cancelOrder",
  "params": [{
    "orderId": orderId,
    "signature": signature,
    "apiKey": "<api_key_or_jwt>"
  }]
});
```

Which we send to the endpoint as we have done previously:

```typescript
await this.actionsWebsocket.send(cancelOrderObject);
```
