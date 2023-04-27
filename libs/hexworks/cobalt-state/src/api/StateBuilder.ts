import { ProgramError } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
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

type GetEventType<T> = T extends Event<infer U> ? U : never;

export type StateBuilder<D, C, N extends string> = {
    withSchema(schema: Schema<D>): StateBuilder<D, C, N>;
    onEvent: <E extends Event<T>, T extends string = GetEventType<E>>(
        type: T,
        fn: (builder: TransitionBuilder<D, C, T, E, N>) => StateBuilder<D, C, N>
    ) => StateBuilder<D, C, N>;
    onEntry: (
        fn: (data: D) => RTE.ReaderTaskEither<C, ProgramError, D>
    ) => StateBuilder<D, C, N>;
    onExit: (
        fn: (data: D) => RTE.ReaderTaskEither<C, ProgramError, D>
    ) => StateBuilder<D, C, N>;
    build: () => Readonly<State<D, C, N>>;
};
