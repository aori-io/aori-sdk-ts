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

**Installation**

To install the SDK, run the following command:

```bash
npm install @aori-io/sdk
```

Or using Yarn:

```bash
yarn add @aori-io/sdk
```

**Initialization**

After installation, use the following import command interact with the SDK:

```typescript
import * as AoriSDK from '@aori-io/sdk';
```
Then access specific functions like so:
```typescript
const formattedLimitOrder = AoriSDK.formatIntoLimitOrder();
```
