# Aori TypeScript SDK

![H](assets/aori-banner.svg)

[![https://devs.aori.io](https://img.shields.io/badge/🗨_telegram_chat-0088cc)](https://devs.aori.io) ![npm (scoped)](https://img.shields.io/npm/v/%40aori-io/sdk) ![npm](https://img.shields.io/npm/dm/%40aori-io/sdk) ![NPM](https://img.shields.io/npm/l/%40aori-io%2Fsdk) ![GitHub issues](https://img.shields.io/github/issues-raw/aori-io/aori-sdk-ts?color=blue)



Aori is a high-performance orderbook protocol for high-frequency trading on-chain and facilitating OTC settlement. This repository provides a TypeScript SDK for interacting with the Aori API to help developers integrate and build on top of the protocol as easily as possible.

Other packages are available for more periphery use cases of Aori to help developers build trading strategies and applications faster.

| Package | Description |
| --- | --- |
| [@aori-io/sdk](https://github.com/aori-io/aori-sdk-ts) | For interacting with the Aori API. These are in the form of `Provider`s that are lightweight clients to help structure calls. |
| [@aori-io/adapters](https://github.com/aori-io/aori-adapters-ts) | Adapters for Aggregators, Decentralised Exchanges and Liquidity Sources on-chain. Logic and quoters for `QuoteMakers` can also be found here. |
| [@aori-io/indexing](https://github.com/aori-io/aori-indexers-ts) | Helpers for indexing orders from the eventstream to rebuild local orderbooks for trading and secondary-source data querying such as frontends and dashboards. |

This SDK is released under the [MIT License](LICENSE).

## Documentation

You can find up-to-date documentation at https://docs.aori.io that details all information on our SDKs and how to use them.