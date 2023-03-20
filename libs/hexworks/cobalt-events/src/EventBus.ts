import * as TE from "fp-ts/TaskEither";
import { JsonPrimitive } from "type-fest";
import { Schema } from "zod";
import {
    DisposeFailedError,
    EventHandlerRegistrationError,
    EventPublicationError,
    EventSchemaNotRegisteredError,
    SubscriptionFailedError,
} from "./error";
import { Event, Scope, Type } from "./Event";

export type CallbackResult = "KeepSubscription" | "DisposeSubscription";

export type UnsavedSubscription = {
    type: Type;
    scope?: Scope;
    filter: Record<string, JsonPrimitive>;
};

/**
 * Represents a subscription to an event (by its `type` and `scope`).
 */
export type Subscription = {
    id: string;
    type: Type;
    scope: Scope;
    /**
     * The `filter` will be matched against the `data` of the event.
     * A subscriber will only be notified if `data` contains all the key-value
     * pairs of `filter`.
     */
    filter: Record<string, JsonPrimitive>;
    /**
     * Disposes the subscription.
     */
    dispose: () => TE.TaskEither<DisposeFailedError, void>;
};

export type UnsavedHandler = {
    type: Type;
    scope?: Scope;
    callback: (
        event: Event,
        subscription: Subscription
    ) => TE.TaskEither<DisposeFailedError, void>;
};

export type Handler = {
    type: Type;
    scope: Scope;
    schema: Schema;
};

/**
 * Encapsulates the logic for handling, publishing and subscribing to events.
 */
export type EventBus = {
    /**
     * Publishes the given event to all subscribers.
     * In case there is no subscriber for the given event it will be left
     * unhandled.
     * Note that events can only be published if their type is registered.
     */
    publish: (
        event: Event
    ) => TE.TaskEither<
        EventPublicationError | EventSchemaNotRegisteredError,
        Event
    >;
    /**
     * Registers the given `schema` as the schema for the given `type`.
     */
    registerType: (
        type: Type,
        schema: Schema
    ) => TE.TaskEither<EventHandlerRegistrationError, Type>;
    /**
     * Registers the given event handler. The handler will be called when an event
     * with the given type and scope is published.
     * This will also retroactively process all unhandled events that were published
     * before the handler was created.
     */
    registerHandler: (
        handler: UnsavedHandler
    ) => TE.TaskEither<EventHandlerRegistrationError, Handler>;
    /**
     * Creates a new subscription for the given event type, scope and filter.
     */
    subscribe(
        subscription: UnsavedSubscription
    ): TE.TaskEither<SubscriptionFailedError, Subscription>;
    /**
     * Disposes the given scope. This will remove all subscriptions and handlers
     * related to the given scope, but will leave the events intact.
     */
    disposeScope(scope: Scope): TE.TaskEither<DisposeFailedError, Scope>;
};
