import { ProgramError, UnknownError } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { List, Map } from "immutable";
import { AnyStateWithContext, StateInstance } from ".";
import { pipe } from "fp-ts/lib/function";

export type Dispatcher<C> = {
    dispatch: <D>(
        stateName: string,
        data: D,
        event: Event<string>
    ) => RTE.ReaderTaskEither<
        C,
        ProgramError,
        StateInstance<unknown, C, string>
    >;
};

export const dispatcher = <C>(
    possibleStates: List<AnyStateWithContext<C>>
): Dispatcher<C> => {
    const lookup = possibleStates.reduce(
        (map, state) => map.set(state.name, state),
        Map<string, AnyStateWithContext<C>>()
    );
    const dispatch = <D>(stateName: string, data: D, event: Event<string>) => {
        const state = lookup.get(stateName);
        const eventType = event.type;
        if (state) {
            const transitions = state.transitions[eventType];
            if (transitions) {
                const transition = transitions.find((t) =>
                    t.condition(event, data)
                );
                if (transition) {
                    return pipe(
                        state.onExit(data),
                        RTE.chain((d) => transition.transitionTo(event, d)),
                        RTE.chain((s) => s.state.onEntry(s.data))
                    );
                } else {
                    return RTE.left(
                        new UnknownError("No applicable transition")
                    );
                }
            } else {
                return RTE.left(new UnknownError("Unknown event"));
            }
        } else {
            return RTE.left(new UnknownError("Unknown state"));
        }
    };
    return { dispatch };
};
