import { WebSocket } from "ws";

export function connectTo(wsUrl: string) {
    return new WebSocket(wsUrl);
}