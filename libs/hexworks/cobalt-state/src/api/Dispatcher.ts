import { ProgramError, safeParseAsync } from "@hexworks/cobalt-core";
import { Event, EventBus, SubscriptionOption } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/lib/Task";
import { pipe } from "fp-ts/lib/function";
import { List, Map, Set } from "immutable";
import {
    AnyStateWithContext,
    DispatcherError,
    State,
    StateInstance,
    StateRepository,
    ThisIsABugError,
    UnknownEventError,
    UnknownStateError,
    UnknownStateWithContext,
} from ".";
import { StateTransitionError } from "./errors/StateTransitionError";

type Deps<I> = {
    eventBus: EventBus;
    stateInstanceRepository: StateRepository<I>;
    errorReporter: (error: ProgramError, event: Event<string>) => T.Task<void>;
};

export type AutoDispatcher = {
    stop: () => void;
};

export type Dispatcher<C, E extends Event<string> = Event<string>> = {
    supportedEventTypes: Set<string>;
    supportedStates: Map<string, UnknownStateWithContext<C>>;
    dispatch: <D>(
        stateName: string,
        data: D,
        event: E
    ) => RTE.ReaderTaskEither<
        C,
        DispatcherError,
        StateInstance<unknown, C, string>
    >;
};

export type EventWithStateKey<K> = Event<string> & {
    stateKey: K;
};

export const autoDispatch = <C, K, E extends EventWithStateKey<K>>(
    dispatcher: Dispatcher<C, E>
): RTE.ReaderTaskEither<C & Deps<K>, ProgramError, AutoDispatcher> => {
    const supportedEventTypes = dispatcher.supportedEventTypes;
    return pipe(
        RTE.ask<C & Deps<K>>(),
        RTE.map((ctx) => {
            const { eventBus, stateInstanceRepository, errorReporter } = ctx;
            return supportedEventTypes.map((eventType) =>
                eventBus.subscribe<string, E>(eventType, (event) => {
                    const key = event.stateKey;
                    return pipe(
                        stateInstanceRepository.findByKey(key),
                        TE.chainW((entity) => {
                            const { stateName, data } = entity;
                            return dispatcher.dispatch(
                                stateName,
                                data,
                                event
                            )(ctx);
                        }),
                        TE.chainW(({ state, data }) => {
                            return stateInstanceRepository.upsert({
                                key: key,
                                stateName: state.name,
                                data,
                            });
                        }),
                        TE.getOrElseW((e) => errorReporter(e, event)),
                        T.map(() => ({
                            subscription: SubscriptionOption.Keep,
                        }))
                    );
                })
            );
        }),
        RTE.map((subscriptions) => {
            return {
                stop: () => {
                    subscriptions.forEach((subscription) =>
                        subscription.cancel()
                    );
                },
            };
        })
    );
};

export const dispatcher = <C, E extends Event<string>>(
    possibleStates: List<AnyStateWithContext<C>>
): Dispatcher<C, E> => {
    const supportedStates = possibleStates.reduce(
        (map, state) => map.set(state.name, state),
        Map<string, UnknownStateWithContext<C>>()
    );

    const supportedEventTypes = possibleStates
        .flatMap((state) => Object.keys(state.transitions))
        .toSet();

    const dispatch = <D>(
        stateName: string,
        data: D,
        event: Event<string>
    ): RTE.ReaderTaskEither<
        C,
        DispatcherError,
        StateInstance<unknown, C, string>
    > => {
        const state = supportedStates.get(stateName) as
            | State<D, C, string>
            | undefined;
        const eventType = event.type;
        if (state) {
            const transitions = state.transitions[eventType];
            if (transitions) {
                const transition = transitions.find((t) =>
                    t.condition(data, event)
                );
                if (transition) {
                    return pipe(
                        RTE.fromTaskEither(safeParseAsync(state.schema)(data)),
                        RTE.chain(() => state.onExit(data)),
                        RTE.chain((d) => transition.transitionTo(d, event)),
                        RTE.chain((stateInstance) =>
                            pipe(
                                stateInstance.state.onEntry(stateInstance.data),
                                RTE.map((d) => ({
                                    state: stateInstance.state,
                                    data: d,
                                }))
                            )
                        ),
                        RTE.mapLeft(
                            (e) => new StateTransitionError(state.name, e)
                        )
                    );
                } else {
                    return RTE.left(new ThisIsABugError(event, data));
                }
            } else {
                return RTE.left(new UnknownEventError(event));
            }
        } else {
            return RTE.left(new UnknownStateError(stateName));
        }
    };

    return { supportedStates, supportedEventTypes, dispatch };
};
