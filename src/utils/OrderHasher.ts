import { defaultAbiCoder } from "@ethersproject/abi";
import { hexZeroPad } from "@ethersproject/bytes";
import { keccak256 } from "@ethersproject/keccak256";
import { ConsiderationItem, OfferItem, OrderComponents, OrderParameters } from "@opensea/seaport-js/lib/types";
import { solidityPacked, solidityPackedKeccak256 } from "ethers";

class OrderHasher {
    _OFFER_ITEM_TYPEHASH: string;
    _CONSIDERATION_ITEM_TYPEHASH: string;
    _ORDER_TYPEHASH: string;

    constructor() {
        const offerItemTypeString = solidityPacked(
            ['string', 'string', 'string', 'string', 'string', 'string', 'string'],
            [
                'OfferItem(',
                'uint8 itemType,',
                'address token,',
                'uint256 identifierOrCriteria,',
                'uint256 startAmount,',
                'uint256 endAmount',
                ')'
            ]
        );

        // Construct the ConsiderationItem type string.
        const considerationItemTypeString = solidityPacked(
            ['string', 'string', 'string', 'string', 'string', 'string', 'string', 'string'],
            [
                'ConsiderationItem(',
                'uint8 itemType,',
                'address token,',
                'uint256 identifierOrCriteria,',
                'uint256 startAmount,',
                'uint256 endAmount,',
                'address recipient',
                ')'
            ]
        );

        const orderComponentsPartialTypeString = solidityPacked(
            ['string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string', 'string'],
            [
                'OrderComponents(',
                'address offerer,',
                'address zone,',
                'OfferItem[] offer,',
                'ConsiderationItem[] consideration,',
                'uint8 orderType,',
                'uint256 startTime,',
                'uint256 endTime,',
                'bytes32 zoneHash,',
                'uint256 salt,',
                'bytes32 conduitKey,',
                'uint256 counter',
                ')'
            ]
        );


        this._OFFER_ITEM_TYPEHASH = keccak256(offerItemTypeString);
        this._CONSIDERATION_ITEM_TYPEHASH = keccak256(considerationItemTypeString);
        // this._ORDER_TYPEHASH = keccak256(orderComponentsPartialTypeString);
        this._ORDER_TYPEHASH = keccak256(solidityPacked(
            ["bytes", "bytes", "bytes"],
            [orderComponentsPartialTypeString, considerationItemTypeString, offerItemTypeString]
        ));
    }

    public _getOrderHash = async (order: OrderComponents, counter: number) => {
        const orderParameters = {
            offerer: order.offerer,
            zone: order.zone,
            offer: order.offer,
            consideration: order.consideration,
            orderType: order.orderType,
            startTime: order.startTime,
            endTime: order.endTime,
            zoneHash: order.zoneHash,
            salt: order.salt,
            conduitKey: order.conduitKey,
            totalOriginalConsiderationItems: order.consideration.length
        };

        return await this._deriveOrderHash(orderParameters, counter);
    }

    private async _deriveOrderHash(orderParameters: OrderParameters, counter: number): Promise<string> {
        const offerHashes = orderParameters.offer.map(offerItem =>
            this._hashOfferItem(offerItem)
        );

        const considerationHashes = orderParameters.consideration.map(considerationItem =>
            this._hashConsiderationItem(considerationItem)
        );

        const orderHash = keccak256(defaultAbiCoder.encode(
            ['bytes32', 'address', 'address', 'bytes32', 'bytes32', 'uint8', 'uint256', 'uint256', 'bytes32', 'uint256', 'bytes32', 'uint256'],
            [
                this._ORDER_TYPEHASH,
                orderParameters.offerer,
                orderParameters.zone,
                solidityPackedKeccak256(['bytes32[]'], [offerHashes]),
                solidityPackedKeccak256(['bytes32[]'], [considerationHashes]),
                orderParameters.orderType,
                orderParameters.startTime,
                orderParameters.endTime,
                hexZeroPad(orderParameters.zoneHash, 32),
                orderParameters.salt,
                hexZeroPad(orderParameters.conduitKey, 32),
                counter
            ]
        ));

        return orderHash;
    }

    private _hashOfferItem(offerItem: OfferItem): string {
        const offerItemHash = keccak256(defaultAbiCoder.encode(
            ['bytes32', 'uint8', 'address', 'uint256', 'uint256', 'uint256'],
            [
                this._OFFER_ITEM_TYPEHASH,
                offerItem.itemType,
                offerItem.token,
                offerItem.identifierOrCriteria,
                offerItem.startAmount,
                offerItem.endAmount
            ])
        );

        return offerItemHash;
    }

    private _hashConsiderationItem(considerationItem: ConsiderationItem): string {
        return keccak256(defaultAbiCoder.encode(
            ['bytes32', 'uint8', 'address', 'uint256', 'uint256', 'uint256', 'address'],
            [
                this._CONSIDERATION_ITEM_TYPEHASH,
                considerationItem.itemType,
                considerationItem.token,
                considerationItem.identifierOrCriteria,
                considerationItem.startAmount,
                considerationItem.endAmount,
                considerationItem.recipient
            ]
        ));
    }

}

const orderHasher = new OrderHasher();
export const getOrderHash = orderHasher._getOrderHash;