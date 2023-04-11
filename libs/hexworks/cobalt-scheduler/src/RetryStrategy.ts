import { JsonObject } from "type-fest";
import { JobErrorDescriptor } from "./job";
import { JobResult } from "./job/JobResult";

/**
 * Can be used to retry failed tasks.
 */
export type RetryStrategy<T extends JsonObject> = {
    handle: (error: JobErrorDescriptor<T>) => JobResult;
};
