import { State } from "./State";

/**
 * Represents a state with a specific instance of data and an identifier.
 */
export type StateInstance<D, C, N extends string> = {
    state: State<D, C, N>;
    data: D;
};
