import * as TE from "fp-ts/TaskEither";
import { StateEntity } from "./StateEntity";
import { StateInstanceNotFoundError, StateUpsertFailedError } from "./errors";

export type StateRepository<I, D, E extends StateEntity<I, D>> = {
    findById: (id: I) => TE.TaskEither<StateInstanceNotFoundError, E>;
    upsert: (stateInstance: E) => TE.TaskEither<StateUpsertFailedError, E>;
};
