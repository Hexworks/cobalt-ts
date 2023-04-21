import { IdProvider, createLogger } from "@hexworks/cobalt-core";
import {
    ProgramError,
    UnknownError,
    ZodValidationError,
    toJson,
} from "@hexworks/cobalt-data";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Duration } from "luxon";
import { JsonObject } from "type-fest";
import { JobRepository, UnsavedLog } from "./JobRepository";
import { Timer } from "./Timer";
import {
    JobAlreadyExistsError,
    JobExecutionError,
    JobStorageError,
    NoHandlerFoundError,
    SchedulerNotRunningError,
    SchedulerStartupError,
} from "./error";
import {
    AnyJob,
    AnyJobDescriptor,
    AnyJobHandler,
    Job,
    JobDescriptor,
    JobHandler,
    JobState,
} from "./job";

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
     * Stops this scheduler. It can't be used after this.
     */
    stop: () => TE.TaskEither<ProgramError, void>;
};

type Deps = {
    jobRepository: JobRepository;
    handlers: Map<string, JobHandler<JsonObject>>;
    timer: Timer;
    idProvider: IdProvider;
    jobCheckInterval?: Duration;
};

const logger = createLogger("Scheduler");

export const Scheduler = ({
    jobRepository,
    handlers,
    timer,
    idProvider,
    jobCheckInterval = DEFAULT_JOB_CHECK_INTERVAL,
}: Deps): Scheduler => {
    let state: "stopped" | "running" | "uninitialized" = "uninitialized";

    const start = () => {
        switch (state) {
            case "stopped":
                return TE.left(
                    new SchedulerStartupError("Scheduler is stopped.")
                );
            case "running":
                return TE.left(
                    new SchedulerStartupError("Scheduler is already running.")
                );
            case "uninitialized":
                state = "running";
                return pipe(
                    executeNextJobs(),
                    TE.mapLeft((e) => new SchedulerStartupError(e))
                );
        }
    };

    const schedule = <T extends JsonObject>(
        job: JobDescriptor<T>
    ): TE.TaskEither<SchedulingError<T>, Job<T>> => {
        if (state !== "running") {
            return TE.left(new SchedulerNotRunningError());
        } else {
            return pipe(
                findHandler(job),
                TE.chainW(() => {
                    return jobRepository.upsert({
                        ...job,
                        correlationId:
                            job.correlationId ?? idProvider.generateId(),
                        state: JobState.SCHEDULED,
                        currentFailCount: 0,
                    });
                })
            );
        }
    };

    const stop = () => {
        state = "stopped";
        timer.cancel();
        return TE.right(undefined);
    };

    const failJob = <E extends ProgramError>({
        job,
        log,
        error,
    }: {
        job: AnyJob;
        log: UnsavedLog;
        error: E;
    }): TE.TaskEither<ProgramError, void> => {
        return pipe(
            jobRepository.upsert({
                ...job,
                state: JobState.FAILED,
                log,
            }),
            TE.chainW(() => TE.left(error))
        );
    };

    const completeJob = (job: AnyJob): TE.TaskEither<ProgramError, void> => {
        let note = `Job ${job.name} completed successfully.`;
        if (job.currentFailCount > 0) {
            note = `${note} Clearing fail count.`;
        }
        return pipe(
            jobRepository.upsert({
                ...job,
                state: JobState.COMPLETED,
                currentFailCount: 0,
                log: {
                    note,
                },
            }),
            TE.map(() => undefined)
        );
    };

    const findHandler = (
        job: AnyJobDescriptor
    ): TE.TaskEither<NoHandlerFoundError, AnyJobHandler> => {
        const { type } = job;
        const handler = handlers.get(type);
        if (handler && handler.canExecute(job)) {
            return TE.right(handler);
        } else {
            logger.warn(`No handler found for job type ${type}.`);
            return TE.left(new NoHandlerFoundError(type));
        }
    };

    const executeJob = (job: AnyJob): TE.TaskEither<ProgramError, void> => {
        const scheduler = { schedule };

        return pipe(
            TE.Do,
            TE.bind("job", () =>
                jobRepository.upsert({
                    ...job,
                    state: JobState.RUNNING,
                    log: {
                        note: "Starting job...",
                    },
                })
            ),
            TE.bindW("handler", () => findHandler(job)),
            TE.bindW("result", ({ handler }) => {
                logger.info(`Executing job ${job.name}.`);
                const context = {
                    data: job.data,
                    job,
                    scheduler,
                };
                return pipe(
                    handler.execute(context),
                    TE.mapLeft(
                        (e) => new JobExecutionError(context, handler, e)
                    )
                );
            }),
            TE.fold(
                (error): TE.TaskEither<ProgramError, void> => {
                    switch (error.__tag) {
                        case "JobExecutionError":
                            return error.handler.onError(error);
                        default:
                            return TE.left(error);
                    }
                },
                ({ handler, result, job }) => {
                    return handler.onResult({
                        data: job.data,
                        job,
                        result,
                        scheduler,
                    });
                }
            ),
            TE.fold(
                (error) => {
                    return failJob({
                        job,
                        log: {
                            note: `Job execution failed. Cause: ${error.message}`,
                            type: error.__tag,
                            data: toJson(error),
                        },
                        error,
                    });
                },
                () => {
                    return completeJob(job);
                }
            )
        );
    };

    const executeNextJobs = (): TE.TaskEither<ProgramError, void> => {
        if (state !== "running") {
            return TE.fromTask(() => Promise.resolve());
        }

        return TE.tryCatch(
            async () => {
                logger.info("Executing next batch of jobs...");
                const startedAt = Date.now();
                const jobs = await jobRepository.findNextJobs()();
                await Promise.allSettled(jobs.map((job) => executeJob(job)()));
                // TODO: reporting
                const end = Date.now();
                const passed = end - startedAt;
                if (passed > jobCheckInterval.milliseconds) {
                    logger.warn(
                        `Job execution took longer (${passed}ms) than the check interval (${jobCheckInterval.milliseconds}ms).`
                    );
                }
                logger.info(`Executed jobs in ${passed}ms.`);
                timer.setTimeout(
                    executeNextJobs,
                    jobCheckInterval.milliseconds
                );
            },
            (error) => {
                logger.error("Failed to execute next jobs.", error);
                timer.setTimeout(
                    executeNextJobs,
                    jobCheckInterval.milliseconds
                );
                return new UnknownError(error);
            }
        );
    };

    return {
        start,
        schedule,
        stop,
    };
};
