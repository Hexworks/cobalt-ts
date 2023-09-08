import * as RT from "fp-ts/ReaderTask";
import * as RTE from "fp-ts/ReaderTaskEither";
import { List } from "immutable";
import { JsonObject } from "type-fest";
import {
    AnyJob,
    Job,
    JobDescriptor,
    JobNotFoundError,
    JobState,
    JobStorageError,
} from ".";

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

export type JobToUpdate<T extends JsonObject> = Partial<JobToSave<T>> & {
    id: string;
};

/**
 * This repository is responsible for persisting and loading {@link Job}s.
 * @param CONTEXT the context of the database functions (eg: a database transaction)
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type JobRepository<CONTEXT> = {
    /**
     * Returns the next jobs that should be executed (eg: where scheduledAt <= now).
     * **Note that** this function also filters for job states that are in the
     * {@link JobState.SCHEDULED} state.
     */
    findNextJobs: () => RT.ReaderTask<CONTEXT, List<AnyJob>>;

    findById: <D extends JsonObject>(
        id: string
    ) => RTE.ReaderTaskEither<CONTEXT, JobNotFoundError, Job<D>>;

    /**
     * Creates the given job.
     */
    create: <D extends JsonObject>(
        job: JobToSave<D>
    ) => RTE.ReaderTaskEither<CONTEXT, JobStorageError, Job<D>>;

    /**
     * Updates the given job.
     */
    update: <D extends JsonObject>(
        job: JobToUpdate<D>
    ) => RTE.ReaderTaskEither<CONTEXT, JobStorageError, Job<D>>;

    deleteById: (
        id: string
    ) => RTE.ReaderTaskEither<CONTEXT, JobNotFoundError, Job<JsonObject>>;

    /**
     * Tries to delete all jobs having the given correlationId.
     * @returns the number of deleted records
     */
    deleteByCorrelationId: (
        correlationId: string
    ) => RTE.ReaderTaskEither<CONTEXT, JobStorageError, number>;
};
