import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { JsonObject, JsonValue } from "type-fest";
import { JobStorageError, JobNotFoundError } from "./error";
import { AnyJob, Job, JobDescriptor, JobState } from "./job";

export type UnsavedLog = {
    note: string;
    type?: string;
    data?: JsonObject;
};

export type JobToSave<T extends JsonObject> = JobDescriptor<T> & {
    /**
     * A unique identifier that can be used to find jobs that were caused
     * by each other. This will be filled in by the scheduler.
     */
    correlationId: string;
    /**
     * The current state of the job.
     */
    state: JobState;
    /**
     * The number of times this job has failed in a row.
     */
    currentFailCount?: number;
    /**
     * The time when this job was last scheduled (if it was ever scheduled).
     * This is useful for performing exponential backoff.
     */
    previouslyScheduledAt?: Date;
    log?: UnsavedLog;
};

/**
 * This repository is responsible for persisting and loading {@link Job}s.
 */
export type JobRepository = {
    /**
     * Tries to find a job by its unique name.
     */
    findByName: (
        name: string
    ) => TE.TaskEither<JobNotFoundError, Job<JsonObject>>;
    /**
     * Returns the next jobs that should be executed (eg: where scheduledAt <= now).
     * **Note that** this function also filters for job states that are in the
     * {@link JobState.SCHEDULED} state.
     */
    findNextJobs: () => T.Task<AnyJob[]>;
    /**
     * Creates or updates the given job.
     */
    upsert: <T extends JsonObject>(
        job: JobToSave<T>
    ) => TE.TaskEither<JobStorageError, Job<T>>;
};
