/* eslint-disable @typescript-eslint/ban-types */
import { ProgramError, safeParseAsync } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { List, Map, Set } from "immutable";
import {
    AnyStateWithContext,
    State,
    StateInstance,
    StateMachineError,
    ThisIsABugError,
    UnknownEventError,
    UnknownStateError,
    UnknownStateWithContext,
} from ".";
import { StateTransitionError } from "./errors/StateTransitionError";

/**
 * Implements a state machine that supports extended states (state instances).
 * @see https://en.wikipedia.org/wiki/UML_state_machine
 * if you want to learn more about the concepts.
 */
export type StateMachine<
    CONTEXT,
    EVENT extends Event<string> = Event<string>
> = {
    supportedEventTypes: Set<string>;
    supportedStates: Map<string, UnknownStateWithContext<CONTEXT>>;
    /**
     * Enters a new state with the given `stateName` using the given `data`.
     * @returns the resulting state instance or an error if entering the
     * state failed.
     * *Note that this will execute the entry actions for the given state*.
     */
    enter: <DATA, NAME extends string>(
        stateInstance: StateInstance<DATA, CONTEXT, NAME>
    ) => RTE.ReaderTaskEither<
        CONTEXT,
        ProgramError,
        StateInstance<DATA, CONTEXT, NAME>
    >;
    /**
     * Dispatches the given `event` with the given state instance
     * to this state machine
     * @param stateName The current state.
     * @param data The extended state of the current state (instance data)
     * @param event The event to dispatch to the current state
     * @returns The result of dispatching the event (possibly a new state)
     */
    dispatch: <DATA, NAME extends string>(
        stateInstance: StateInstance<DATA, CONTEXT, NAME>,
        event: EVENT
    ) => RTE.ReaderTaskEither<
        CONTEXT,
        StateMachineError,
        StateInstance<unknown, CONTEXT, string>
    >;
};

export type EventWithStateId<ID> = Event<string> & {
    id: ID;
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
                return RTE.left(new UnknownEventError(state.name, event.type));
            }
        } else {
            return RTE.left(new UnknownStateError(stateName));
        }
    };

    return { supportedStates, supportedEventTypes, enter, dispatch };
};
