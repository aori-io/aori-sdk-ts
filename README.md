# Aori TypeScript SDK

![H](assets/aori.svg)

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
    - [Creating a Limit Order](#creating-a-limit-order)
    - [Publishing a Limit Order](#publishing-a-limit-order)
    - [Cancelling a Limit Order](#cancelling-a-limit-order)
  - [Orderbook Queries](#orderbook-queries)
    - [Querying the Orderbook](#querying-the-orderbook)
    - [Subscribing to the orderbook](#subscribing-to-the-orderbook)
  - [Order Taking, Execution and Settlement](#order-taking-execution-and-settlement)
    - [Taking an Order](#taking-an-order)
    - [Executing an order](#executing-an-order)
  - [Template Bots](#template-bots)
    - [LimitOrderManager](#limitordermanager)
    - [FromInventoryExecutor](#frominventoryexecutor)


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
provider.on(NotificationEvents.OrderToExecute, (...) => {
  ...
});
```

# Key Functionalities

There are a number of key functionalities that can be performed using the SDK. Examples are accompanied by code snippets below.

### Creating a Limit Order

Limit orders are the first class citzen of the Aori protocol, based off the traditional limit order. A limit order object can be created via the helper function `createLimitOrder` provided.

```typescript
const offerer = "0x...";
const inputToken = "0x...";
const inputAmount = '1000000000000000000'; // Selling 1 unit of token A
const outputToken = "0x...";
const outputAmount = '1000000000000000000'; // Buying 1 unit of token B
const chainId = 5;

const provider = new AoriProvider(...);
...
...
...
const order = await provider.createLimitOrder({
    offerer,
    inputToken,
    outputToken,
    inputAmount,
    outputAmount,
    chainId,
});
```

It should be noted that this does not actually publish the limit order into the Aori orderbook - it only creates the order object locally to format it correctly before it is sent off. 

### Publishing a Limit Order

To publish a limit order, the method `makeOrder` can be used. Upon success, the limit order will be published live onto the orderbook for another user or trader to take.
```typescript
const chainId = 5; // Goerli
const provider = new AoriProvider(...);
...
...
...
const order = await provider.createLimitOrder(...);
...
...
...
await provider.makeOrder({ order: order, chainId: chainId });
```

### Cancelling a Limit Order

To cancel a limit order, the method `cancelOrder` can be used. Upon success, the limit order will be cancelled from the orderbook for another user or trader to take.
```typescript
const chainId = 5; // Goerli
const orderId = "...";
const provider = new AoriProvider(...);
...
...
...
await provider.cancelOrder({ orderId: orderId, chainId: chainId });
```

## Orderbook Queries

### Querying the Orderbook
To view any public orders available to take on the orderbook, the method `viewOrderbook` can be used. This will provide a snapshot of the orderbook with the provided filter. If no filter is given, the entire orderbook will be returned (within pagination limits).
```typescript
const chainId = 5; // Goerli
const provider = new AoriProvider(...);
...
...
...
provider.on(AoriMethods.ViewOrderbook, (orders) => {
    ...
});
...
await provider.viewOrderbook({});
```

### Subscribing to the Orderbook

Alternatively, one can utilise the subscription to global orderbook events. By default, this is provided. Relevant events for the updating of the state of public orders will be emitted to allow clients to manage a local view of the orderbook for their own purposes.

All relevant orderbook events are under the enum `SubscriptionEvents`.
```typescript
const chainId = 5; // Goerli
const provider = new AoriProvider(...);
...
...
...
provider.on(SubscriptionEvents.OrderCreated, (order) => {
    ...
});
...
...
...
provider.on(SubscriptionEvents.OrderCancelled, (order) => {
    ...
});
...
...
...
provider.on(SubscriptionEvents.OrderTaken, (order) => {
    ...
});
...
...
...
provider.on(SubscriptionEvents.OrderFulfilled, (orderHash) => {
    ...
});
...
```

## Order Taking, Execution and Settlement

### Taking an Order

A market taker can take an order by calling the `takeOrder` method.

```typescript
const chainId = 5; // Goerli
const makerOrderId = "...";
const provider = new AoriProvider(...);
...
...
...
const takerOrder = await provider.createLimitOrder(...); // Make a matching limit order
...
...
await provider.takeOrder({ orderId: makerOrderId, order: takerOrder, chainId: chainId });
```

### Executing an Order

As a market maker (or a market taker if the market maker has chosen not to make the settlement transaction), you will need to execute to settle the orders on-chain and process the non-custodial exchange of assets.

This requires interaction with the on-chain smart settlement contract at `defaultOrderAddress`.

```typescript
import { OrderToExecute, ResponseEvents } from "@aori-io/sdk";
import { Signature } from "ethers";

const chainId = 5; // Goerli
const provider = new AoriProvider(...);
...
...
...
provider.on(NotificationEvents.OrderToExecute, async ({ contractCall: { to, value, data }}: OrderToExecute) => {
    await provider.wallet.sendTransaction({ to, value, data });
});
```

## Template Bots

This SDK also provides a number of standardised bot templates to use for making development quicker. New boilerplates will be added here as more use cases come up and require standardisation - do feel free to contribute!

### LimitOrderManager

```typescript
import { LimitOrderManager } from '@aori-io/sdk';

const wallet = new Wallet(...);
const provider = new JsonRpcProvider(...);

const bot = new LimitOrderManager({ wallet, provider });

bot.on("ready", () => {
  // ...
  await bot.initialise();
  // ...
});
```

The behaviours are:
- When making an order via `this.makeOrder`, the bot will create a limit order and save its hash under `this.awaitingOrderCreation`.
- On `AoriMethods.AccountOrders`, own orders will be saved under `this.currentLimitOrders`
- On `SubscriptionEvents.OrderCreated`, any expected orders to have been confirmed to be created get removed from `this.awaitingOrderCreation` and get added to `this.currentLimitOrders`.
- On `SubscriptionEvents.OrderCancelled`, if the cancelled order is our own, it gets removed from `this.currentLimitOrders`.
- On `SubscriptionEvents.OrderTaken`, if the taken order is our own, it gets removed from `this.currentLimitOrders`.

### FromInventoryExecutor

The `FromInventoryExecutor` is a standard class that does what a `LimitOrderManager` does, but will additionally handle the on-chain execution of orders.

```typescript
import { FromInventoryExecutor } from '@aori-io/sdk';

const wallet = new Wallet(...);
const provider = new JsonRpcProvider(...);

const bot = new FromInventoryExecutor({ wallet, provider });

bot.on("ready", () => {
  // ...
  await bot.initialise();
  // ...
});
```

The behaviours are:
- Inherited from `LimtiOrderManager` (see [above](#limitordermanager))
- On `NotificationEvents.OrderToExecute`, the bot will execute the order.
