import {
    IdProvider,
    ProgramError,
    ZodValidationError,
    createLogger,
} from "@hexworks/cobalt-core";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { Duration } from "luxon";
import { Logger } from "tslog";
import { JsonObject } from "type-fest";
import {
    AnyJobHandler,
    Job,
    JobAlreadyExistsError,
    JobCancellationFailedError,
    JobDescriptor,
    JobNotFoundError,
    JobRepository,
    JobStorageError,
    NoHandlerFoundError,
    RetryFailedError,
    SchedulerNotRunningError,
    SchedulerStartupError,
    Timer,
} from ".";
import { DefaultScheduler } from "../internal";
import { HandlerCannotExecuteJobError } from "./error/HandlerCannotExecuteJobError";

export type SchedulingError =
    | SchedulerNotRunningError
    | JobStorageError
    | JobAlreadyExistsError
    | NoHandlerFoundError
    | HandlerCannotExecuteJobError
    | JobNotFoundError
    | RetryFailedError
    | ZodValidationError;

export const DEFAULT_JOB_CHECK_INTERVAL = Duration.fromObject({
    seconds: 5,
});

export const DEFAULT_RETRY_INTERVAL = Duration.fromObject({
    minute: 1,
});

/**
 * Can be used to schedule tasks to be executed at a later time.
 * @param T the type of the environment that is required for the functions to work
 *        (eg: a database transaction)
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export type Scheduler<CONTEXT> = {
    /**
     * Starts this scheduler.
     */
    start: () => RTE.ReaderTaskEither<CONTEXT, SchedulerStartupError, void>;

    /**
     * Stops this scheduler. It can't be used after this.
     */
    stop: () => RTE.ReaderTaskEither<CONTEXT, ProgramError, void>;

    /**
     * Adds a new handler to this scheduler. This will overwrite any existing handler
     * for the given job type.
     */
    addHandler: (jobHandler: AnyJobHandler) => void;

    /**
     * Schedules a new Task to be executed at a later time.
     */
    schedule: <D extends JsonObject>(
        job: JobDescriptor<D>
    ) => RTE.ReaderTaskEither<CONTEXT, SchedulingError, Job<D>>;

    /**
     * Retries the job with the given id (with exponential backoff).
     * Will return an error if the job is not in a failed state.
     */
    retry: <D extends JsonObject>(
        id: string
    ) => RTE.ReaderTaskEither<CONTEXT, SchedulingError, Job<D>>;

    /**
     * Cancels the job with the given id.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there was no job, or it was already executed)
     */
    cancelById(
        id: string
    ): RTE.ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean>;

    /**
     * Cancels any jobs with the given correlation id.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there were no jobs, or they were already executed)
     */
    cancelByCorrelationId(
        id: string
    ): RTE.ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean>;
};

export type ContextBoundScheduler = {
    /**
     * Schedules a new Task to be executed at a later time.
     */
    schedule: <D extends JsonObject>(
        job: JobDescriptor<D>
    ) => TE.TaskEither<SchedulingError, Job<D>>;

    /**
     * Retries the given job (with exponential backoff).
     * Will return an error if the job is not in a failed state.
     */
    retry: <D extends JsonObject>(
        id: string
    ) => TE.TaskEither<SchedulingError, Job<D>>;

    /**
     * Cancels the job with the given id.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there was no job, or it was already executed)
     */
    cancelById(id: string): TE.TaskEither<JobCancellationFailedError, boolean>;

    /**
     * Cancels any jobs with the given correlation id.
     * @returns `true` if there was a cancellation, `false` if not
     * (eg: there were no jobs, or they were already executed)
     */
    cancelByCorrelationId(
        id: string
    ): TE.TaskEither<JobCancellationFailedError, boolean>;
};

export const ContextBoundScheduler = <CONTEXT>(
    ctx: CONTEXT,
    scheduler: Scheduler<CONTEXT>
): ContextBoundScheduler => {
    return {
        schedule: <D extends JsonObject>(job: JobDescriptor<D>) =>
            scheduler.schedule(job)(ctx),
        retry: <D extends JsonObject>(id: string) =>
            scheduler.retry<D>(id)(ctx),
        cancelById: (name: string) => scheduler.cancelById(name)(ctx),
        cancelByCorrelationId: (id: string) =>
            scheduler.cancelByCorrelationId(id)(ctx),
    };
};

type Deps<CONTEXT> = {
    jobRepository: JobRepository<CONTEXT>;
    handlers: Map<string, AnyJobHandler>;
    timer: Timer;
    idProvider: IdProvider<string>;
    jobCheckInterval?: Duration;
    retryInterval?: Duration;
    logger?: Logger<unknown>;
};

export const Scheduler = <CONTEXT = undefined>(
    deps: Deps<CONTEXT>
): Scheduler<CONTEXT> => {
    const {
        jobRepository,
        handlers,
        timer,
        idProvider,
        logger = createLogger("Scheduler"),
        jobCheckInterval = DEFAULT_JOB_CHECK_INTERVAL,
        retryInterval = DEFAULT_RETRY_INTERVAL,
    } = deps;
    return new DefaultScheduler<CONTEXT>(
        jobRepository,
        handlers,
        timer,
        idProvider,
        jobCheckInterval,
        retryInterval,
        logger
    );
};
