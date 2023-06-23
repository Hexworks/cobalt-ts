import { ThisIsABugError } from "./ThisIsABugError";
import { StateTransitionError } from "./StateTransitionError";
import { UnknownEventError } from "./UnknownEventError";
import { UnknownStateError } from "./UnknownStateError";
import { StateUpsertFailedError } from "./StateUpsertFailedError";

export type StateMachineError =
    | ThisIsABugError
    | UnknownEventError
    | UnknownStateError
    | StateUpsertFailedError
    | StateTransitionError;
