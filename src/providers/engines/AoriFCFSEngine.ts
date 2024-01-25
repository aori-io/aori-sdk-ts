import axios from "axios";
import { AoriOrder, AORI_TAKER_API } from "../../utils";

export class AoriFCFSEngine {

    takerUrl: string;

    constructor({ takerUrl }: { takerUrl: string }) {
        this.takerUrl = takerUrl;
    }

    static default(): AoriFCFSEngine {
        return new AoriFCFSEngine({ takerUrl: AORI_TAKER_API });
    }

    async marketOrder({
        order,
        signature,
        seatId
    }: {
        order: AoriOrder,
        signature: string,
        seatId?: number
    }) {
        const { data } = await axios.post(this.takerUrl, {
            id: 1,
            jsonrpc: "2.0",
            method: "aori_takeOrder",
            params: [{
                order,
                signature,
                seatId
            }]
        });
        return data;
    }
}