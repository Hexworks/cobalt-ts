/* eslint-disable @typescript-eslint/no-explicit-any */
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { SchedulingError } from "../Scheduler";
import { Job } from "./Job";
import { JobDescriptor } from "./JobDescriptor";

export type JobContext<I extends JsonObject> = {
    job: Job<I>;
    schedule: <D extends JsonObject>(
        job: JobDescriptor<D>
    ) => TE.TaskEither<SchedulingError, Job<D>>;
    retry: (id: string) => TE.TaskEither<SchedulingError, Job<JsonObject>>;
};

export type JobExecutionResult<I extends JsonObject, O> = JobContext<I> & {
    result: O;
};

export type AnyJobContext = JobContext<any>;

export type AnyJobContextWithResult = JobExecutionResult<any, any>;

export const toJobContextWithResult = <I extends JsonObject, O>(
    context: JobContext<I>,
    result: O
) => {
    return {
        ...context,
        result,
    };
};
