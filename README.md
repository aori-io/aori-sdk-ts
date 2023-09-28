# Aori TypeScript SDK

Aori is a high-performance orderbook protocol for high-frequency trading on-chain and facilitating OTC settlement. This repository provides a TypeScript SDK for interacting with the Aori Websocket-based API to help developers integrate and build on top of the protocol as easily as possible.

This SDK is released under the [MIT License](LICENSE).

---

If you have any further questions, refer to [the technical documentation](https://www.aori.io/developers). Alternatively, please reach out to us [on Discord](https://discord.gg/K37wkh2ZfR) or [on Twitter](https://twitter.com/aori_io).

## Table of Contents
- [Installation](#Installation)
  - [Initialization](#Initialization)
  - [Websockets](#Websockets)
- [Key Functionalities](#UsefulFunctions)
  - [Order Creation and Management]()
    - [Creating a Limit Order](#CreateLimitOrder)
    - [Publishing the Limit Order](#ViewOrderbook)
    - [Cancelling a Limit Order](#CancelLimitOrder)
  - [Orderbook Queries](#OrderbookQueries)
    - [Query the Orderbook](#view-orderbook)
    - [Subscribe to the orderbook](#subscribeOrderbook)
  - [Order Taking, Execution and Settlement]()
    - [Taking an order](#Take)
    - [Executing an order](#Execute)


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

After installation, use the following import command interact with the SDK to import the base class `AoriProvider` that will allow you to do many of the base functionalities:

```typescript
import { AoriProvider } from '@aori-io/sdk';
```
Then access specific functions like so:
```typescript
const provider = new AoriProvider(...);
...
await provider.makeOrder(...);
```

## Sidenote: Websockets

As the Aori API is a Websocket-based API, requests and responses may come back in an asynchronous manner. The `AoriProvider` class is an event-based class that is built to handle this, managing requests through the use of a `counter`.

```
Request:
aori_makeOrder(id = 63, ...)

Corresponding response:
{
  id: 63,
  result: ...
}
```

`AoriProvider` also inherits the `EventEmitter` class, meaning that it will emit events when the responses of requests and notifications (where no request was made to receive) are made.
```typescript
const provider = new AoriProvider(...);
...
provider.on(ResponseEvents.NotificationEvents.OrderToExecute, (...) => {
  ...
});
```

# Key Functionalities

Here we'll go over a few quick examples of how to interact with the main functions of the SDK.

### Creating a Limit Order

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

### View Orderbook

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

### SubscribeOrderbook

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

### TakeOrder

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

### CancelOrder

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
