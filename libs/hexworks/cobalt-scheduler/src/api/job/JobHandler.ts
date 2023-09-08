/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { DefaultJobHandler, JobHandlerParams } from "../../internal";
import { JobExecutionError } from "../error";
import { JobContext, JobExecutionResult } from "./JobContext";
import { JobDescriptor } from "./JobDescriptor";

export type AnyJobHandler = JobHandler<any, any>;

export type AnyExecutionResult = TE.TaskEither<
    JobExecutionResult<JsonObject, ProgramError>,
    JobExecutionResult<JsonObject, any>
>;

/**
 * A job handler is responsible for handling the lifecycle of a Job:
 * - execution
 * - retry
 * - error handling
 * - result handling
 */
export interface JobHandler<I extends JsonObject, O> {
    /**
     * The type of job this handler can handle.
     */
    type: string;

    /**
     * Tells whether this handler can execute the given {@link JobDescriptor}.
     */
    canExecute: (info: JobDescriptor<JsonObject>) => info is JobDescriptor<I>;

    /**
     * Executes the task with the given {@link JobContext}.
     */
    execute: (context: JobContext<I>) => TE.TaskEither<ProgramError, O>;

    /**
     * This callback is executed after the job is completed (and its state is saved in the database)
     */
    onResult: (
        result: JobExecutionResult<I, O>
    ) => TE.TaskEither<ProgramError, void>;

    /**
     * This callback is executed after the job has failed (and its state is saved in the database)
     */
    onError: (
        error: JobExecutionError<I, ProgramError>
    ) => TE.TaskEither<JobExecutionError<I, ProgramError>, void>;
}

export const createJobHandler = <I extends JsonObject, O>(
    params: JobHandlerParams<I, O>
) => {
    return new DefaultJobHandler<I, O>(params);
};
