/* eslint-disable @typescript-eslint/no-explicit-any */
import { IdProvider, ProgramError } from "@hexworks/cobalt-core";
import * as A from "fp-ts/Array";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { identity, pipe } from "fp-ts/function";
import { List, Map } from "immutable";
import {
    CallbackResult,
    DEFAULT_EVENT_SCOPE,
    Event,
    EventBus,
    GetEventType,
    Subscription,
    SubscriptionDescriptor,
} from "../api";
import { EventPublishingError, SubscriptionErrorTuple } from "../api/errors";

const EMPTY_SCOPE = Map<string, List<SubscriptionWithCallback<any, any>>>();
const NO_SUBSCRIBERS = List<SubscriptionWithCallback<any, any>>();

type SubscriptionWithCallback<
    E extends Event<T>,
    T extends string = GetEventType<E>
> = Subscription & {
    fn: (event: E) => TE.TaskEither<ProgramError, CallbackResult>;
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
        fn: (event: E) => TE.TaskEither<ProgramError, CallbackResult>,
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
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fn: __, ...result } = subscription;
        return result;
    }

    publish<T extends string, E extends Event<T>>(
        event: E,
        scope: string = DEFAULT_EVENT_SCOPE
    ): TE.TaskEither<EventPublishingError, void> {
        const { type } = event;
        const results = this.getSubsriptionsBy(scope, type)
            .map((subscription) => {
                const { fn, id } = subscription;
                return pipe(
                    fn(event),
                    TE.map((result) => {
                        if (result.subscription === "Cancel") {
                            this.cancelSubscription({
                                id,
                                scope,
                                type,
                            });
                        }
                    }),
                    TE.mapLeft(
                        (cause) =>
                            [subscription, cause] as SubscriptionErrorTuple
                    )
                );
            })
            .toArray();

        return pipe(
            results,
            A.map(TE.bimap((e) => [e], identity)),
            A.sequence(
                TE.getApplicativeTaskValidation(
                    T.ApplyPar,
                    A.getSemigroup<SubscriptionErrorTuple>()
                )
            ),
            TE.map(() => undefined),
            TE.mapLeft((e) => new EventPublishingError(e))
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
