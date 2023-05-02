import { IdProvider } from "@hexworks/cobalt-core";
import * as T from "fp-ts/Task";
import { List } from "immutable";
import { CallbackResult, Event, Subscription } from ".";
import { DefaultEventBus } from "../internal";

export const DEFAULT_EVENT_SCOPE = "DEFAULT_EVENT_SCOPE";

/**
 * An event bus can be used to broadcast events to subscribers of that event's type.
 */
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
     * Note that you must not throw an Error from `fn` (check the documentation
     * of {@link Task} for more information), you need to take care of all errors
     * within the callback itself.
     */
    subscribe<T extends string, E extends Event<T>>(
        type: T,
        fn: (event: E) => T.Task<CallbackResult>,
        scope?: string
    ): Subscription;

    /**
     * Publishes the given {@link Event} to all listeners that have the same
     * `scope` and `type`. By default {@link DEFAULT_EVENT_SCOPE} will be used.
     */
    publish<T extends string, E extends Event<T>>(
        event: E,
        scope?: string
    ): T.Task<void>;

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
