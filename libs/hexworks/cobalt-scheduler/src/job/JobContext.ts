/* eslint-disable @typescript-eslint/no-explicit-any */
import { JsonObject } from "type-fest";
import { Scheduler } from "../Scheduler";
import { Job } from "./Job";

export type JobContext<T extends JsonObject> = {
    job: Job<T>;
    scheduler: Omit<Scheduler, "start" | "stop">;
};
export type JobContextWithResult<T extends JsonObject, R> = JobContext<T> & {
    result: R;
};

export type AnyJobContext = JobContext<JsonObject>;

export type AnyJobContextWithResult = JobContextWithResult<JsonObject, any>;

export const toJobContextWithResult = <T extends JsonObject, R>(
    context: JobContext<T>,
    result: R
) => {
    return {
        ...context,
        result,
    };
};
