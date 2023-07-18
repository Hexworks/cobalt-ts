import { ProgramError } from "@hexworks/cobalt-core";
import { Event, GetEventType } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { Schema } from "zod";
import { State, StateInstance } from ".";

export type TransitionBuilder<
    S,
    C,
    T extends string,
    E extends Event<T>,
    N extends string
> = {
    withCondition: (
        fn: (data: S, event: E) => boolean
    ) => CondBuilder<S, C, T, E, N>;
    transitionTo: <R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ) => StateBuilder<S, C, N>;
};

export type CondBuilder<
    S,
    C,
    T extends string,
    E extends Event<T>,
    N extends string
> = {
    doTransition: <R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ) => CondFinisherBuilder<S, C, T, E, N>;
};

export type CondFinisherBuilder<
    S,
    C,
    T extends string,
    E extends Event<T>,
    N extends string
> = {
    withCondition: (
        fn: (data: S, event: E) => boolean
    ) => CondBuilder<S, C, T, E, N>;
    otherwise: <R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ) => StateBuilder<S, C, N>;
};

export type StateBuilder<DATA, CONTEXT, NAME extends string> = {
    withSchema(schema: Schema<DATA>): StateBuilder<DATA, CONTEXT, NAME>;
    onEvent: <E extends Event<T>, T extends string = GetEventType<E>>(
        type: T,
        fn: (
            builder: TransitionBuilder<DATA, CONTEXT, T, E, NAME>
        ) => StateBuilder<DATA, CONTEXT, NAME>
    ) => StateBuilder<DATA, CONTEXT, NAME>;
    onEntry: (
        fn: (data: DATA) => RTE.ReaderTaskEither<CONTEXT, ProgramError, DATA>
    ) => StateBuilder<DATA, CONTEXT, NAME>;
    onExit: (
        fn: (data: DATA) => RTE.ReaderTaskEither<CONTEXT, ProgramError, DATA>
    ) => StateBuilder<DATA, CONTEXT, NAME>;
    build: () => Readonly<State<DATA, CONTEXT, NAME>>;
};
