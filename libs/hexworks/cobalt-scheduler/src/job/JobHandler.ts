import { ProgramError } from "@hexworks/cobalt-data";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { Schema } from "zod";
import { RetryStrategy } from "../RetryStrategy";
import { JobDescriptor } from "./JobDescriptor";
import { JobResult } from "./JobResult";

/**
 * A job handler is responsible for executing a task of a given `type`.
 */
export type JobHandler<T extends JsonObject> = {
    type: string;
    /**
     * The schema that is used to validate the input data for the task.
     */
    inputSchema: Schema<T>;
    /**
     * The retry strategy to be used in case the job fails.
     * By default {@link NoRetryStrategy} will be used.
     */
    retryStrategy: RetryStrategy<T>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    canExecute: (info: JobDescriptor<any>) => info is JobDescriptor<T>;
    /**
     * Executes the task with the given {@link JobDescriptor}.
     */
    execute: (info: JobDescriptor<T>) => TE.TaskEither<ProgramError, JobResult>;
};
