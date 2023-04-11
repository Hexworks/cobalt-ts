import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { JobCreationError } from "./error";
import { Job } from "./job";

export type UnsavedJob<T extends JsonObject> = Omit<
    Job<T>,
    "log" | "createdAt" | "updatedAt"
> & {
    note: string;
    logData: JsonObject;
};

export type PersistedJob<T extends JsonObject> = Job<T> & {
    currentFailCount: number;
    previouslyScheduledAt?: Date;
};

/**
 * This repository is responsible for persisting and loading {@link Job}s.
 */
export type JobRepository = {
    /**
     * Tries to find a job by its unique name.
     */
    findByName: (name: string) => TE.TaskEither<Error, Job<JsonObject>>;
    /**
     * Upserts the given job.
     */
    upsertJob: <T extends JsonObject>(
        job: UnsavedJob<T>
    ) => TE.TaskEither<JobCreationError, Job<T>>;
    loadNextJobs: () => T.Task<PersistedJob<JsonObject>[]>;
};
