import { User } from "@hexworks/cobalt-authorization";
import { JsonPrimitive, JsonValue } from "type-fest";

export type Type = string;

export type Scope = string;

export const DEFAULT_SCOPE = "default";

/**
 * Common interface for all events that can be sent using the `EventBus`. Each event
 * must have a `type` which can be used to group events from the same origin / cause together.
 * `trace` can be used to check the chain of events which caused this `Event`. Each event
 * must also has an `emitter` which is the user that emitted this event.
 *
 * An event must be serializable to JSON.
 */
export type Event = {
    id: string;
    /**
     * A type of this
     */
    type: Type;
    /**
     * The scope of this event. Can be used to group different types of events together.
     */
    scope: Scope;
    /**
     * Arbitrary data that can be attached to this event. This will be checked against
     * the type of the
     */
    data: JsonValue;
    /**
     * Arbitrary filter data that can be attached to this event.
     * This will be matched against the [Subscription]'s [Subscription.filter].
     */
    filter: Record<string, JsonPrimitive>;
    /**
     * The user that emitted *this* event.
     */
    emitter: User<unknown>;
    /**
     * Contains a (possibly empty) sequence of events that lead up to *this*
     * one in reverse chronological order (most recent is first, oldest is last).
     */
    trace: Array<Event>;
    /**
     * The timestamp (ms) at which this event was emitted.
     */
    emittedAt: number;
    /**
     * The timestamp (ms) at which this event was handled.
     * This will be `null` if the event was not handled yet.
     */
    handledAt: number | null;
};
