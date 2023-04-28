import { ProgramError, fail } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { Writable } from "type-fest";
import { z } from "zod";
import {
    AnyEventWithType,
    CondBuilder,
    CondFinisherBuilder,
    State,
    StateBuilder,
    StateInstance,
    Transition,
    TransitionBuilder,
} from "..";

const passThroughCond = () => true;
const anySchema = z.any();

export class DefaultStateBuilder<S, C, N extends string>
    implements StateBuilder<S, C, N>
{
    private params: Writable<State<S, C, N>>;

    constructor(name: N) {
        this.params = {
            name,
            schema: anySchema,
            transitions: {},
            onEntry: (s) => RTE.right(s),
            onExit: (s) => RTE.right(s),
        };
    }

    withSchema(schema: z.Schema<S>): StateBuilder<S, C, N> {
        this.params.schema = schema;
        return this;
    }

    onEvent<E extends Event<T>, T extends string = string>(
        type: T,
        fn: (builder: TransitionBuilder<S, C, T, E, N>) => StateBuilder<S, C, N>
    ): StateBuilder<S, C, N> {
        return fn(
            new DefaultTransitionBuilder(this, type, this.params.transitions)
        );
    }

    onEntry(
        fn: (data: S) => RTE.ReaderTaskEither<C, ProgramError, S>
    ): StateBuilder<S, C, N> {
        this.params.onEntry = fn;
        return this;
    }

    onExit(
        fn: (data: S) => RTE.ReaderTaskEither<C, ProgramError, S>
    ): StateBuilder<S, C, N> {
        this.params.onExit = fn;
        return this;
    }

    build(): State<S, C, N> {
        return this.params;
    }
}

class DefaultTransitionBuilder<
    S,
    C,
    T extends string,
    E extends Event<T>,
    N extends string
> implements
        TransitionBuilder<S, C, T, E, N>,
        CondBuilder<S, C, T, E, N>,
        CondFinisherBuilder<S, C, T, E, N>
{
    private cond?: (data: S, event: E) => boolean = undefined;

    constructor(
        private stateBuilder: StateBuilder<S, C, N>,
        private type: T,
        private transitions: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            [T in string]: Transition<S, C, unknown, T, AnyEventWithType<T>>[];
        }
    ) {
        if (!this.transitions[this.type]) {
            this.transitions[type] = [];
        }
    }

    withCondition(
        fn: (data: S, event: E) => boolean
    ): CondBuilder<S, C, T, E, N> {
        this.cond = fn;
        return this;
    }

    doTransition<R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): CondFinisherBuilder<S, C, T, E, N> {
        this.transitions[this.type]?.push({
            condition: this.cond ?? fail("No condition provided"),
            transitionTo: fn,
        } as Transition<S, C, unknown, string, Event<string>>);
        this.cond = undefined;
        return this;
    }

    otherwise<R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): StateBuilder<S, C, N> {
        return this.transitionTo(fn);
    }

    transitionTo<R>(
        fn: (
            data: S,
            event: E
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): StateBuilder<S, C, N> {
        this.transitions[this.type]?.push({
            condition: passThroughCond,
            transitionTo: fn as (
                data: S,
                event: Event<string>
            ) => RTE.ReaderTaskEither<
                C,
                ProgramError,
                StateInstance<unknown, C, string>
            >,
        });

        return this.stateBuilder;
    }
}
