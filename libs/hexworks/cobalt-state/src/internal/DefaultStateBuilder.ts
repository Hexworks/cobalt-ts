import { fail } from "@hexworks/cobalt-core";
import { ProgramError } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { Writable } from "type-fest";
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

export class DefaultStateBuilder<S, C, N extends string>
    implements StateBuilder<S, C, N>
{
    private params: Writable<State<S, C, N>>;

    constructor(name: N) {
        this.params = {
            name,
            transitions: {},
            onEntry: (s) => RTE.right(s),
            onExit: (s) => RTE.right(s),
        };
    }

    onEvent<E extends Event<T>, T extends string = string>(
        type: T,
        fn: (builder: TransitionBuilder<S, C, T, E, N>) => void
    ): StateBuilder<S, C, N> {
        fn(new DefaultTransitionBuilder(this, type, this.params.transitions));
        return this;
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
    private cond?: (event: E, data: S) => boolean = undefined;

    constructor(
        private stateBuilder: StateBuilder<S, C, N>,
        private type: T,
        private transitions: {
            [T in string]: Transition<S, C, any, T, AnyEventWithType<T>>[];
        }
    ) {
        if (!this.transitions[this.type]) {
            this.transitions[type] = [];
        }
    }

    withCondition(
        fn: (event: E, data: S) => boolean
    ): CondBuilder<S, C, T, E, N> {
        this.cond = fn;
        return this;
    }

    doTransition<R>(
        fn: (
            event: E,
            data: S
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): CondFinisherBuilder<S, C, T, E, N> {
        this.transitions[this.type]?.push({
            condition: this.cond ?? fail("No condition provided"),
            transitionTo: fn,
        });
        this.cond = undefined;
        return this;
    }

    otherwise<R>(
        fn: (
            event: E,
            data: S
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): StateBuilder<S, C, N> {
        return this.transitionTo(fn);
    }

    transitionTo<R>(
        fn: (
            event: E,
            data: S
        ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>
    ): StateBuilder<S, C, N> {
        this.transitions[this.type]?.push({
            condition: passThroughCond,
            transitionTo: fn,
        });

        return this.stateBuilder;
    }
}
