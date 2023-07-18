/* eslint-disable @typescript-eslint/no-explicit-any */
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { SchedulingError } from "../Scheduler";
import { Job } from "./Job";
import { JobDescriptor } from "./JobDescriptor";

export type JobContext<DATA extends JsonObject> = {
    data: DATA;
    job: Job<DATA>;
    schedule: <D extends JsonObject>(
        job: JobDescriptor<D>
    ) => TE.TaskEither<SchedulingError, Job<D>>;
};

export type JobExecutionResult<
    INPUT extends JsonObject,
    OUTPUT
> = JobContext<INPUT> & {
    result: OUTPUT;
};

export type AnyJobContext = JobContext<any>;

export type AnyJobContextWithResult = JobExecutionResult<any, any>;

export const toJobContextWithResult = <DATA extends JsonObject, RESULT>(
    context: JobContext<DATA>,
    result: RESULT
) => {
    return {
        ...context,
        result,
    };
};
