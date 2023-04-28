import { ThisIsABugError } from "./ThisIsABugError";
import { StateTransitionError } from "./StateTransitionError";
import { UnknownEventError } from "./UnknownEventError";
import { UnknownStateError } from "./UnknownStateError";

export type DispatcherError =
    | ThisIsABugError
    | UnknownEventError
    | UnknownStateError
    | StateTransitionError;
