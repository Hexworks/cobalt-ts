/**
 * Common interface for all events that can be sent using the {@link EventBus}. Each event
 * must have a `type` that can be used to group events from the same origin / cause together.
 * `trace` can be used to check the chain of events that caused the current event. Each event
 * must also has an `emitter` which is the object that emitted the event.
 */
export type Event<T extends string> = {
    /**
     * The type of the event..
     */
    type: T;
};
