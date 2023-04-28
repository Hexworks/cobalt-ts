import { JsonObject } from "type-fest";
import { JobDescriptor, JobLog, JobState } from ".";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyJob = Job<JsonObject>;

/**
 * Represents an individual **job** instance.
 */
export type Job<T extends JsonObject> = JobDescriptor<T> & {
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
    currentFailCount: number;
    /**
     * The time when this job was created.
     */
    createdAt: Date;
    /**
     * The time when this job was last updated.
     */
    updatedAt: Date;
    /**
     * The time when this job was last scheduled (if it was ever scheduled).
     * This is useful for performing exponential backoff.
     */
    previouslyScheduledAt?: Date;
    log: JobLog[];
};
