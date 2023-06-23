/* eslint-disable @typescript-eslint/ban-types */
import * as TE from "fp-ts/TaskEither";
import { StateInstanceNotFoundError, StateUpsertFailedError } from "./errors";

type UnsavedStateEntity<I, D, E = {}> = {
    id: I;
    stateName: string;
    data: D;
} & E;

export type StateEntity<I, D, E = {}> = {
    id: I;
    stateName: string;
    data: D;
} & E;

export type StateRepository<I = string, E = {}> = {
    findById: (
        id: I
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) => TE.TaskEither<StateInstanceNotFoundError, StateEntity<I, any, E>>;
    upsert: <D>(
        stateEntity: UnsavedStateEntity<I, D, E>
    ) => TE.TaskEither<StateUpsertFailedError, StateEntity<I, D, E>>;
};
