import { ProgramError } from "@hexworks/cobalt-core";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Schema } from "zod";
import { AnyEventWithType, StateBuilder, Transition } from ".";
import { DefaultStateBuilder } from "../internal";

export type UnknownStateWithContext<C> = State<unknown, C, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyStateWithContext<C> = State<any, C, string>;

/**
 * Describes the shape of a state in a state machine. Does not contain the
 * actual data (@see StateInstance).
 * @param D The type of the data that is stored in the state.
 * @param C The type of the context that is passed to the state machine.
 * @param N The name of the state.
 */
export type State<D, C, N extends string> = {
    /**
     * The schema of the data that is stored in the state.
     */
    readonly schema: Schema<D>;
    /**
     * The name of the state (must be unique within a state machine).
     */
    readonly name: N;
    /**
     * The transitions that can be triggered by events.
     * @param T The type (string representation) of the event.
     * @see Transition
     * @see Event
     */
    readonly transitions: {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [T in string]: Transition<D, C, unknown, T, AnyEventWithType<T>>[];
    };
    /**
     * An action that will be executed when the state is **entered**.
     * @param data The data that is stored in the state.
     * @see StateInstance
     */
    readonly onEntry: (data: D) => RTE.ReaderTaskEither<C, ProgramError, D>;
    /**
     * An action that will be executed when the state is **exited**
     * (after a successful state transition).
     * @param data The data that is stored in the state.
     * @see StateInstance
     */
    readonly onExit: (data: D) => RTE.ReaderTaskEither<C, ProgramError, D>;
};

/**
 * Builder function that can be used to create a new state.
 * @param name the unique name of the state.
 * @param D The type of the data that is stored in the state.
 * @param C The type of the context that is passed to the state machine.
 * @param N The name of the state.
 * @returns
 */
export const state = <D = void, C = never, N extends string = string>(
    name: N
): StateBuilder<D, C, N> => {
    return new DefaultStateBuilder(name);
};

/**
 * Returns a new {@link StateInstance} with the given data.
 */
export const newState = <D = void, C = never, N extends string = string>(
    state: State<D, C, N>,
    data: D
) =>
    RTE.right({
        state,
        data,
    });

/**
 * Executes the given `fn` with the given `context` and returns the result.
 */
export const executeWithContext =
    <D, C>(
        fn: (stateData: D, context: C) => TE.TaskEither<ProgramError, unknown>
    ) =>
    (state: D) =>
        pipe(
            RTE.ask<C>(),
            RTE.chain((context) => {
                return RTE.fromTaskEither(fn(state, context));
            }),
            RTE.map(() => state)
        );
