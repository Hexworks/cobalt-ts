import { ProgramError } from "@hexworks/cobalt-data";
import { JsonObject } from "type-fest";
import { Job } from "./Job";

/**
 * Contains the result of a failed job. Used by the {@link RetryStrategy}
 * to determine if the job should be retried or not.
 */
export type JobErrorDescriptor<T extends JsonObject> = Job<T> & {
    currentFailCount: number;
    previouslyScheduledAt?: Date;
    error: ProgramError;
};
