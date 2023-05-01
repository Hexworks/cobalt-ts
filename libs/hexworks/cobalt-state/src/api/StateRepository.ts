import * as TE from "fp-ts/TaskEither";
import { StateEntity } from "./StateEntity";
import { StateInstanceNotFoundError, StateUpsertFailedError } from "./errors";

export type StateRepository<I> = {
    findByKey: (
        key: I
    ) => TE.TaskEither<StateInstanceNotFoundError, StateEntity<I, unknown>>;
    upsert: (
        stateInstance: StateEntity<I, unknown>
    ) => TE.TaskEither<StateUpsertFailedError, StateEntity<I, unknown>>;
};
