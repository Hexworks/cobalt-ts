import { IdProvider } from "@hexworks/cobalt-core";
import { ProgramError, ZodValidationError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { Duration } from "luxon";
import { JsonObject } from "type-fest";
import {
    Job,
    JobAlreadyExistsError,
    JobCancellationFailedError,
    JobDescriptor,
    JobHandler,
    JobRepository,
    JobStorageError,
    NoHandlerFoundError,
    SchedulerNotRunningError,
    SchedulerStartupError,
    Timer,
} from ".";
import { DefaultScheduler } from "../internal";

export type SchedulingError<T extends JsonObject> =
    | SchedulerNotRunningError
    | JobStorageError
    | JobAlreadyExistsError
    | NoHandlerFoundError
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
        job: JobDescriptor<T>
    ) => TE.TaskEither<SchedulingError<T>, Job<T>>;
    /**
     * Cancels the job with the given name.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there was no job, or it was already executed)
     */
    cancelByName(
        name: string
    ): TE.TaskEither<JobCancellationFailedError, boolean>;
    /**
     * Cancels any jobs with the given correlation id.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there were no jobs, or they were already executed)
     */
    cancelByCorrelationId(
        id: string
    ): TE.TaskEither<JobCancellationFailedError, boolean>;
    /**
     * Stops this scheduler. It can't be used after this.
     */
    stop: () => TE.TaskEither<ProgramError, void>;
};

type Deps = {
    jobRepository: JobRepository;
    handlers: Map<string, JobHandler<JsonObject>>;
    timer: Timer;
    idProvider: IdProvider<string>;
    jobCheckInterval?: Duration;
};

export const Scheduler = (deps: Deps): Scheduler => {
    const {
        jobRepository,
        handlers,
        timer,
        idProvider,
        jobCheckInterval = DEFAULT_JOB_CHECK_INTERVAL,
    } = deps;
    return new DefaultScheduler(
        jobRepository,
        handlers,
        timer,
        idProvider,
        jobCheckInterval
    );
};
