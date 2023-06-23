import { State } from "./State";

/**
 * Represents a state with a specific instance of data and an identifier.
 * This is called an extended state in the UML state machine terminology.
 */
export type StateInstance<D, C, N extends string> = {
    state: State<D, C, N>;
    data: D;
};
