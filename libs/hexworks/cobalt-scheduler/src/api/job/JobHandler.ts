import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionError } from "../error";
import { JobContext, JobExecutionResult } from "./JobContext";
import { JobDescriptor } from "./JobDescriptor";
import { JobResult } from "./JobResult";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyJobHandler = JobHandler<any>;

export type AnyExecutionResult = TE.TaskEither<
    JobExecutionResult<JsonObject, ProgramError>,
    JobExecutionResult<JsonObject, JobResult>
>;

/**
 * A job handler is responsible for handling the lifecycle of a Job:
 * - execution
 * - retry
 * - error handling
 * - result handling
 */
export interface JobHandler<DATA extends JsonObject> {
    /**
     * The type of job this handler can handle.
     */
    type: string;
    /**
     * Tells whether this handler can execute the given {@link JobDescriptor}.
     */
    canExecute: (
        info: JobDescriptor<JsonObject>
    ) => info is JobDescriptor<DATA>;
    /**
     * Executes the task with the given {@link JobContext}.
     */
    execute: (
        context: JobContext<DATA>
    ) => TE.TaskEither<ProgramError, JobResult>;

    onResult: (
        result: JobExecutionResult<DATA, JobResult>
    ) => TE.TaskEither<ProgramError, void>;

    onError: (
        error: JobExecutionError<DATA>
    ) => TE.TaskEither<JobExecutionError<DATA>, void>;
}
