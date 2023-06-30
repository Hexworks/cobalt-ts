/* eslint-disable @typescript-eslint/ban-types */
import { ProgramError, safeParseAsync } from "@hexworks/cobalt-core";
import { Event, EventBus, SubscriptionOption } from "@hexworks/cobalt-events";
import * as R from "fp-ts/Reader";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/lib/Task";
import { pipe } from "fp-ts/lib/function";
import { List, Map, Set } from "immutable";
import { JsonObject } from "type-fest";
import {
    AnyStateWithContext,
    State,
    StateEntity,
    StateInstance,
    StateMachineError,
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

export type AutoDispatcherDeps<
    C,
    B extends JsonObject = JsonObject,
    I = string,
    E = {}
> = {
    eventBus: EventBus;
    stateRepository: StateRepository<I, B, E>;
    mapInstance: <D extends B, N extends string>(
        stateInstance: StateInstance<D, C, N>,
        extras: E
    ) => StateEntity<I, D, E>;
    errorReporter: ErrorReporter;
};

/**
 * An auto dispatcher uses the given `stateMachine` to automatically
 * dispatch events to the appropriate states and stores the resulting
 * state instances in the given `stateRepository`.
 */
export type AutoDispatcher<
    C,
    B extends JsonObject = JsonObject,
    I = string,
    E = {}
> = {
    /**
     * Executes the entry actions for the given state instance
     * and saves the result as the current state.
     * @param instance
     * @returns
     */
    create: <D extends B, N extends string>(
        instance: StateInstance<D, C, N>,
        extras: E
    ) => TE.TaskEither<ProgramError, StateEntity<I, D, E>>;
    stop: () => void;
};

/**
 * Implements a state machine that supports extended states (state instances).
 * @see https://en.wikipedia.org/wiki/UML_state_machine
 * if you want to learn more about the concepts.
 */
export type StateMachine<C, E extends Event<string> = Event<string>> = {
    supportedEventTypes: Set<string>;
    supportedStates: Map<string, UnknownStateWithContext<C>>;
    /**
     * Enters a new state with the given `stateName` using the given `data`.
     * @returns the resulting state instance or an error if entering the
     * state failed.
     * *Note that this will execute the entry actions for the given state*.
     */
    enter: <D, N extends string>(
        stateInstance: StateInstance<D, C, N>
    ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<D, C, N>>;
    /**
     * Dispatches the given `event` with the given state instance
     * to this state machine
     * @param stateName The current state.
     * @param data The extended state of the current state (instance data)
     * @param event The event to dispatch to the current state
     * @returns The result of dispatching the event (possibly a new state)
     */
    dispatch: <D, N extends string>(
        stateInstance: StateInstance<D, C, N>,
        event: E
    ) => RTE.ReaderTaskEither<
        C,
        StateMachineError,
        StateInstance<unknown, C, string>
    >;
};

export type EventWithStateId<I> = Event<string> & {
    id: I;
};

/**
 * Enhances the given state machine with auto-dispatching functionality.
 * This means that it will automatically listen to the appropriate events
 * and will store the resulting state instances in the given `stateRepository`.
 * @param stateMachine
 * @returns An `AutoDispatcher` that can be used to stop the auto-dispatching
 * or create new state instances.
 */
export const autoDispatch = <
    C,
    B extends JsonObject = JsonObject,
    I = string,
    E = {}
>(
    stateMachine: StateMachine<C, EventWithStateId<I>>
): R.Reader<C & AutoDispatcherDeps<C, B, I, E>, AutoDispatcher<C, B, I, E>> => {
    const { supportedEventTypes, supportedStates } = stateMachine;
    return pipe(
        R.ask<C & AutoDispatcherDeps<C, B, I, E>>(),
        R.map((ctx) => {
            const { eventBus, stateRepository, errorReporter } = ctx;
            return {
                subscriptions: supportedEventTypes.map((eventType) =>
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
                                    const state =
                                        supportedStates.get(stateName);
                                    if (!state) {
                                        return TE.left(
                                            new UnknownStateError(stateName)
                                        );
                                    }
                                    return stateMachine.dispatch(
                                        {
                                            state,
                                            data,
                                        },
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
                ),
                ctx,
            };
        }),
        R.map(({ subscriptions, ctx }) => {
            const { stateRepository, mapInstance } = ctx;
            return {
                create: <D extends B, N extends string>(
                    instance: StateInstance<D, C, N>,
                    extras: E
                ) => {
                    return pipe(
                        stateMachine.enter(instance)(ctx),
                        TE.map((instance) => mapInstance(instance, extras)),
                        TE.chainW(stateRepository.upsert)
                    );
                },
                stop: () => {
                    subscriptions.forEach((subscription) =>
                        subscription.cancel()
                    );
                },
            };
        })
    );
};

export const newStateMachine = <C, E extends Event<string>>(
    possibleStates: List<AnyStateWithContext<C>>
): StateMachine<C, E> => {
    const supportedStates = possibleStates.reduce(
        (map, state) => map.set(state.name, state),
        Map<string, UnknownStateWithContext<C>>()
    );

    const supportedEventTypes = possibleStates
        .flatMap((state) => Object.keys(state.transitions))
        .toSet();

    const enter = <D, N extends string>(
        stateInstance: StateInstance<D, C, N>
    ): RTE.ReaderTaskEither<C, ProgramError, StateInstance<D, C, N>> => {
        const { state, data } = stateInstance;
        const stateName = state.name;
        const expectedState = supportedStates.get(stateName) as
            | State<D, C, string>
            | undefined;
        if (!expectedState || expectedState !== state) {
            return RTE.left(new UnknownStateError(stateName));
        }
        return pipe(
            RTE.fromTaskEither(safeParseAsync(state.schema)(data)),
            RTE.chain(() => state.onEntry(data)),
            RTE.map((data) => ({
                ...stateInstance,
                data,
            }))
        );
    };

    const dispatch = <D, N extends string>(
        stateInstance: StateInstance<D, C, N>,
        event: Event<string>
    ): RTE.ReaderTaskEither<
        C,
        StateMachineError,
        StateInstance<unknown, C, string>
    > => {
        const { state, data } = stateInstance;
        const stateName = state.name;
        const expectedState = supportedStates.get(stateName) as
            | State<D, C, string>
            | undefined;
        const eventType = event.type;
        if (expectedState && expectedState === state) {
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
                                RTE.map((data) => ({
                                    ...stateInstance,
                                    data,
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

    return { supportedStates, supportedEventTypes, enter, dispatch };
};
