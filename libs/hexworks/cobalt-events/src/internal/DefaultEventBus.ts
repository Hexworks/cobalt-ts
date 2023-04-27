/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdProvider } from "@hexworks/cobalt-core";
import * as T from "fp-ts/lib/Task";
import { pipe } from "fp-ts/lib/function";
import { List, Map } from "immutable";
import {
    CallbackResult,
    DEFAULT_EVENT_SCOPE,
    Event,
    EventBus,
    Subscription,
    SubscriptionDescriptor,
} from "../api";

const EMPTY_SCOPE = Map<string, List<SubscriptionWithCallback<any, any>>>();
const NO_SUBSCRIBERS = List<SubscriptionWithCallback<any, any>>();

type SubscriptionWithCallback<
    T extends string,
    E extends Event<T>
> = Subscription & {
    fn: (event: E) => T.Task<CallbackResult>;
};

export class DefaultEventBus implements EventBus {
    private subscriptions: Map<
        string,
        Map<string, List<SubscriptionWithCallback<any, any>>>
    > = Map();
    private idProvider: IdProvider<string>;

    constructor(idProvider: IdProvider<string>) {
        this.idProvider = idProvider;
    }

    fetchSubscribersOf(
        type: string,
        scope: string = DEFAULT_EVENT_SCOPE
    ): List<Subscription> {
        return this.getSubsriptionsBy(scope, type).map((s) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { fn, ...rest } = s;
            return rest;
        });
    }

    subscribe<T extends string, E extends Event<T>>(
        type: string,
        fn: (event: E) => T.Task<CallbackResult>,
        scope: string = DEFAULT_EVENT_SCOPE
    ): Subscription {
        const id = this.idProvider.generateId();
        const subscription = {
            scope,
            type,
            id,
            fn,
            cancel: () => {
                this.cancelSubscription({ scope, type, id });
            },
        };
        this.subscriptions = this.subscriptions.update(
            scope,
            EMPTY_SCOPE,
            (v) => v.update(type, NO_SUBSCRIBERS, (v) => v.push(subscription))
        );
        const { fn: _, ...result } = subscription;
        return result;
    }

    publish<T extends string, E extends Event<T>>(
        event: E,
        scope: string = DEFAULT_EVENT_SCOPE
    ): T.Task<void> {
        const result = this.getSubsriptionsBy(scope, event.type)
            .map((s) => {
                return pipe(
                    s.fn(event),
                    T.map((result) => {
                        if (result.subscription === "Cancel") {
                            this.cancelSubscription({
                                scope,
                                type: event.type,
                                id: s.id,
                            });
                        }
                    }),
                    T.map(() => undefined)
                );
            })
            .toArray();
        return pipe(
            T.sequenceArray(result),
            T.map(() => undefined)
        );
    }

    cancelScope(scope: string): void {
        this.subscriptions = this.subscriptions.delete(scope);
    }

    private getSubsriptionsBy(
        scope: string,
        type: string
    ): List<SubscriptionWithCallback<any, any>> {
        return this.subscriptions
            .get(scope, EMPTY_SCOPE)
            .get(type, NO_SUBSCRIBERS);
    }

    private cancelSubscription(subscription: SubscriptionDescriptor): void {
        this.subscriptions = this.subscriptions.update(
            subscription.scope,
            EMPTY_SCOPE,
            (v) =>
                v.update(subscription.type, NO_SUBSCRIBERS, (v) =>
                    v.filter((s) => s.id !== subscription.id)
                )
        );
    }
}
