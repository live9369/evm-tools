import { BaseHooksAPI } from "@/app/hooks/createBaseHooksAPI";
import { EventCardData } from "@/app/components/EventCard";

export interface EventHooksAPI extends BaseHooksAPI {
    eventArgs: Record<string, unknown>;
    addEventCard: (data: {
        eventName?: string;
        args?: Array<{ name: string; type: string; value: string }>;
        blockNumber?: number;
        transactionHash?: string;
    }) => void;
}

export function createEventHooksAPI(
    baseAPI: BaseHooksAPI,
    eventArgs: Record<string, unknown>,
    eventName: string,
    decodedArgs: Array<{ name: string; type: string; value: string }>,
    eventObj?: { blockNumber?: number; transactionHash?: string },
    onAddEventCard?: (card: EventCardData) => void
): EventHooksAPI {
    return {
        ...baseAPI,
        eventArgs: eventArgs,
        addEventCard: (data: {
            eventName?: string;
            args?: Array<{ name: string; type: string; value: string }>;
            blockNumber?: number;
            transactionHash?: string;
        }) => {
            const eventId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
            const eventCard: EventCardData = {
                id: eventId,
                eventName: data.eventName || eventName,
                args: data.args || decodedArgs,
                blockNumber: data.blockNumber ?? eventObj?.blockNumber,
                transactionHash: data.transactionHash || eventObj?.transactionHash
            };
            onAddEventCard?.(eventCard);
        },
    };
}

