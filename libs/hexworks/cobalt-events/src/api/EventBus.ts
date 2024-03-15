import { IdProvider, ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { List } from "immutable";
import { CallbackResult, Event, Subscription } from ".";
import { DefaultEventBus } from "../internal";
import { EventPublishingError } from "./errors";

export const DEFAULT_EVENT_SCOPE = "DEFAULT_EVENT_SCOPE";

/**
 * An event bus can be used to broadcast events to subscribers of that event's type.
 */
// TODO: add trace to the events and check for circular references
export interface EventBus {
    /**
     * Returns all subscribers for the event with the given `type` and `scope`.
     * By default {@link DEFAULT_EVENT_SCOPE} will be used.
     */
    fetchSubscribersOf(type: string, scope?: string): List<Subscription>;

    /**
     * Subscribes the callee to events that have the given `scope` and `type`.
     * `fn` will be called whenever there is a matching event that's being published.
     * By default {@link DEFAULT_EVENT_SCOPE} will be used.
     * {@link CallbackResult} can be used to control the {@link Subscription}:
     * - `Keep` will keep the subscription
     * - `Cancel` will cancel it
     * and to issue followup events.
     *
     * If there was an error during the execution of the callback a {@link ProgramError}
     * can be returned and the publisher of the event will be able to handle it.
     */
    subscribe<TYPE extends string, EVENT extends Event<TYPE>>(
        type: TYPE,
        fn: (event: EVENT) => TE.TaskEither<ProgramError, CallbackResult>,
        scope?: string
    ): Subscription;
        
    /**
     * Publishes the given {@link Event} to all listeners that have the same
     * `scope` and `type`. By default {@link DEFAULT_EVENT_SCOPE} will be used.
     *
     * If there were error(s) during the execution then each error will be
     * returned in a {@link EventPublishingError} that also contains the
     * {@link Subscription} that caused the error.
     */
    publish<TYPE extends string, EVENT extends Event<TYPE>>(
        event: EVENT,
        scope?: string
    ): TE.TaskEither<EventPublishingError, void>;

    /**
     * Cancels all [Subscription]s for the given [scope].
     */
    cancelScope(scope: string): void;
}

type Deps = {
    idProvider: IdProvider<string>;
};

export const EventBus = ({ idProvider }: Deps): EventBus =>
    new DefaultEventBus(idProvider);
