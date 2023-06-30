import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { StateInstanceNotFoundError, StateUpsertFailedError } from "./errors";

export type StateEntity<
    I,
    D,
    // eslint-disable-next-line @typescript-eslint/ban-types
    E = {}
> = {
    id: I;
    stateName: string;
    data: D;
} & E;

// eslint-disable-next-line @typescript-eslint/ban-types
export type StateRepository<I = string, B = JsonObject, E = {}> = {
    findById: (
        id: I
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => TE.TaskEither<StateInstanceNotFoundError, StateEntity<I, B, E>>;
    upsert: <D extends B>(
        stateInstance: StateEntity<I, D, E>
    ) => TE.TaskEither<StateUpsertFailedError, StateEntity<I, D, E>>;
};
