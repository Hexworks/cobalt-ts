import { safeParseAsync } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { List, Map, Set } from "immutable";
import {
    AnyStateWithContext,
    DispatcherError,
    State,
    StateInstance,
    ThisIsABugError,
    UnknownEventError,
    UnknownStateError,
    UnknownStateWithContext,
} from ".";
import { StateTransitionError } from "./errors/StateTransitionError";

export type Dispatcher<C> = {
    supportedEventTypes: Set<string>;
    dispatch: <D>(
        stateName: string,
        data: D,
        event: Event<string>
    ) => RTE.ReaderTaskEither<
        C,
        DispatcherError,
        StateInstance<unknown, C, string>
    >;
};

export const dispatcher = <C>(
    possibleStates: List<AnyStateWithContext<C>>
): Dispatcher<C> => {
    const lookup = possibleStates.reduce(
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
        const state = lookup.get(stateName) as State<D, C, string> | undefined;
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
    return { supportedEventTypes, dispatch };
};
