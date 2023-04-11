import { ZodValidationError } from "@hexworks/cobalt-data";
import { pipe } from "fp-ts/lib/function";
import * as R from "fp-ts/Reader";
import * as TE from "fp-ts/TaskEither";
import { Map } from "immutable";
import { Duration } from "luxon";
import { JsonObject } from "type-fest";
import {
    JobCreationError,
    SchedulerNotRunningError,
    SchedulerStartupError,
} from "./error";
import { Job, JobDescriptor, JobHandler } from "./job";
import { JobRepository } from "./JobRepository";

export type SchedulingError<T extends JsonObject> =
    | SchedulerNotRunningError
    | JobCreationError
    | ZodValidationError<T>;

export const DEFAULT_JOB_CHECK_INTERVAL = Duration.fromObject({
    seconds: 5,
});

/**
 * Can be used to schedule tasks to be executed at a later time.
 */
export type Scheduler = {
    /**
     * Starts this scheduler.
     */
    start: () => TE.TaskEither<SchedulerStartupError, void>;
    /**
     * Schedules a new Task to be executed at a later time.
     */
    schedule: <T extends JsonObject>(
        task: JobDescriptor<T>
    ) => TE.TaskEither<SchedulingError<T>, Job<T>>;
    /**
     * Stops this scheduler. It can't be used after this.
     */
    stop: () => void;
};

type Deps = {
    jobRepository: JobRepository;
    handlers: Map<string, JobHandler<JsonObject>>;
    jobCheckInterval?: Duration;
};

export const Scheduler = ({
    jobRepository,
    handlers,
    jobCheckInterval = DEFAULT_JOB_CHECK_INTERVAL,
}: Deps): Scheduler => {
    let timer: ReturnType<typeof setInterval> | undefined = undefined;

    {
        return {
            start: () => {
                if (!timer) {
                    timer = setInterval(() => {
                        // TODO: Implement
                    }, jobCheckInterval.milliseconds);
                }
                return TE.right(undefined);
            },
            schedule: () => {
                if (!timer) {
                    return TE.left(new SchedulerNotRunningError());
                }
                throw new Error("Not implemented");
            },
            stop: () => {
                if (timer) {
                    clearInterval(timer);
                    timer = undefined;
                }
                return TE.right(undefined);
            },
        };
    }
};
