import { createEventSource, EventSourceClient } from "eventsource-client";
import { AoriOrder } from "../utils";

type SettlementData = {
    orderHash: string,
    transactionHash: string,
    order: AoriOrder,
    zone: string,
    chainId: number,
    extraData: string
}

export class SettlementProvider {
    url?: string;
    session?: EventSourceClient;
    onSettlement?: (data: SettlementData) => void;

    initialise(url: string, settlementHandler: (data: SettlementData) => void) {
        this.url = url;
        this.session = undefined;
        this.onSettlement = settlementHandler;
        this.reconnect();
    }

    async reconnect() {
        if (!this.url) return;
        if (this.session) {
            this.session.close();
            // Wait 10 seconds before reconnecting.
            console.log(`Waiting 10 seconds before reconnecting SettlementProvider...`);
            await new Promise(resolve => setTimeout(resolve, 10 * 1000));
        }

        this.session = createEventSource({
            url: this.url,
            method: "POST",
            onMessage: ({ data: _data }) => {
                try {
                    if (_data.toString() == "Connected") {
                        console.log("SettlementProvider reconnected");
                        return;
                    }

                    const { event, data } = JSON.parse(_data.toString());
                    console.log("Received message from settlement server: ", event, data);

                    if (event != "Settled") {
                        console.log("Received unknown message type: ", event, data);
                        return;
                    }

                    if (!this.onSettlement) return;
                    this.onSettlement(data);
                } catch (e: any) {
                    console.error(e);
                }
            },
            onDisconnect: () => {
                console.log("SettlementProvider disconnected, reconnecting...");
                this.reconnect();
            }
        });
    }
}