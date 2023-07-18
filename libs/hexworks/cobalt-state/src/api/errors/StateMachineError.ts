import { StateTransitionError } from "./StateTransitionError";
import { ThisIsABugError } from "./ThisIsABugError";
import { UnknownEventError } from "./UnknownEventError";
import { UnknownStateError } from "./UnknownStateError";

export type StateMachineError =
    | ThisIsABugError
    | UnknownEventError
    | UnknownStateError
    | StateTransitionError;
