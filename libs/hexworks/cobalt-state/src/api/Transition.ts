import { ProgramError } from "@hexworks/cobalt-data";
import { Event } from "@hexworks/cobalt-events";
import * as RTE from "fp-ts/ReaderTaskEither";
import { StateInstance } from ".";

/**
 * Describes a transition from one state to another triggered by an event.
 *
 * @param D The type of the data that is stored in the state.
 * @param C The type of the context that is passed to the state machine.
 * @param R The type of the data that is stored in the state that is transitioned to.
 * @param T The type (string representation) of the event.
 * @param E The type of the event that triggers the transition.
 */
export type Transition<D, C, R, T extends string, E extends Event<T>> = {
    /**
     * The condition that must be met for the transition to be executed.
     */
    condition: (event: E, data: D) => boolean;
    /**
     * Executes the state transition and returns the new {@link StateInstance}
     * or an error if the transition failed.
     */
    transitionTo: (
        event: E,
        data: D
    ) => RTE.ReaderTaskEither<C, ProgramError, StateInstance<R, C, string>>;
};
