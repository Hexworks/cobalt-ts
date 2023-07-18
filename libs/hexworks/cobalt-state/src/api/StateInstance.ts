import { State } from "./State";

/**
 * Represents a state with a specific instance of data and an identifier.
 * This is called an extended state in the UML state machine terminology.
 */
export type StateInstance<DATA, CONTEXT, NAME extends string> = {
    state: State<DATA, CONTEXT, NAME>;
    data: DATA;
};
