import WebSocket from 'ws';
import dotenv from 'dotenv';
import * as Colours from './Colours';

dotenv.config();

export class WebSocketManager {
  private actionsWebsocket: WebSocket;
  private subscriptionsWebsocket: WebSocket;

  constructor() {
    this.actionsWebsocket = new WebSocket('wss://api.beta.order.aori.io');
    this.subscriptionsWebsocket = new WebSocket('wss://api.beta.order.aori.io');

    this.init();
  }

  private init() {
    this.actionsWebsocket.on('open', () => {
      console.log('WebSocket connection opened.');
      this.sendPayload();
    });

    this.actionsWebsocket.on('message', (data) => {
      console.log('Received:', data.toString());
    });

    this.actionsWebsocket.on('error', (error) => {
      console.error('WebSocket Error:', error);
    });

    this.actionsWebsocket.on('close', () => {
      console.log('WebSocket connection closed.');
    });
  }

  private sendPayload() {
    const payload = JSON.stringify({
      "id": 2034,
      "jsonrpc": "2.0",
      "method": "aori_viewOrderbook",
      "params": [{
        "chainId": 5,
        "query": {
          "base": Colours.usdcAddress,
          "quote": Colours.wethAddress
        }
      }]
    });

    setInterval(() => {
      this.actionsWebsocket.send(payload);
    }, 5000);
  }
}
