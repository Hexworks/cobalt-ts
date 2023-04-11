import { JsonObject } from "type-fest";
import { JobDescriptor, JobLog, JobState } from ".";

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
    createdAt: Date;
    updatedAt: Date;
    log: JobLog[];
};
