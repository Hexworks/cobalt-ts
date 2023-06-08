import { ProgramError, safeParseAsync } from "@hexworks/cobalt-core";
import { Event, EventBus, SubscriptionOption } from "@hexworks/cobalt-events";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/lib/Task";
import { pipe } from "fp-ts/lib/function";
import { List, Map, Set } from "immutable";
import {
    AnyStateWithContext,
    DispatcherError,
    State,
    StateEntity,
    StateInstance,
    StateRepository,
    ThisIsABugError,
    UnknownEventError,
    UnknownStateError,
    UnknownStateWithContext,
} from ".";
import { StateTransitionError } from "./errors/StateTransitionError";

export type ErrorReporter = {
    report: (error: ProgramError, event: Event<string>) => T.Task<void>;
};

export type AutoDispatcherDeps<I, D, E extends StateEntity<I, D>> = {
    eventBus: EventBus;
    stateRepository: StateRepository<I, D, E>;
    errorReporter: ErrorReporter;
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

export type EventWithStateId<I> = Event<string> & {
    id: I;
};

export const autoDispatch = <C, I, D, E extends StateEntity<I, D>>(
    dispatcher: Dispatcher<C, EventWithStateId<I>>
): R.Reader<C & AutoDispatcherDeps<I, D, E>, AutoDispatcher> => {
    const supportedEventTypes = dispatcher.supportedEventTypes;
    return pipe(
        R.ask<C & AutoDispatcherDeps<I, D, E>>(),
        R.map((ctx) => {
            const { eventBus, stateRepository, errorReporter } = ctx;
            return supportedEventTypes.map((eventType) =>
                eventBus.subscribe<string, EventWithStateId<I>>(
                    eventType,
                    (event) => {
                        const { id } = event;
                        return pipe(
                            TE.Do,
                            TE.bind("entity", () => {
                                return stateRepository.findById(id);
                            }),
                            TE.bindW("newState", ({ entity }) => {
                                const { stateName, data } = entity;
                                return dispatcher.dispatch(
                                    stateName,
                                    data,
                                    event
                                )(ctx);
                            }),
                            TE.chainW(({ entity, newState }) => {
                                return stateRepository.upsert({
                                    ...entity,
                                    stateName: newState.state.name,
                                    data: newState.data,
                                });
                            }),
                            TE.getOrElseW((e) => {
                                return errorReporter.report(e, event);
                            }),
                            T.map(() => ({
                                subscription: SubscriptionOption.Keep,
                            }))
                        );
                    }
                )
            );
        }),
        R.map((subscriptions) => {
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
