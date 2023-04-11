import { JsonObject } from "type-fest";

/**
 * Contains all the user-supplied data that is necessary to schedule a job.
 */
export type JobDescriptor<T extends JsonObject> = {
    /**
     * The name of the job. Every job has a unique name.
     * This can be used to find the job in the {@link JobRepository}
     * and prevents accidental duplication of jobs.
     */
    name: string;
    /**
     * The type of the job. This is used to find the appropriate handler
     * for the given job when it needs to be executed.
     */
    type: string;
    /**
     * Custom data that can be used by the job. Note that this data
     * must be serializable (hence the `JsonObject` type).
     */
    data: T;
    /**
     * The time when the job should be executed. If `scheduleAt` is earlier than the
     * current timestamp then the job will be executed immediately.
     */
    scheduledAt: Date;
};
