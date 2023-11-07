import { WebSocket } from "ws";

export function connectTo(wsUrl: string): WebSocket {
    return new WebSocket(wsUrl);
}