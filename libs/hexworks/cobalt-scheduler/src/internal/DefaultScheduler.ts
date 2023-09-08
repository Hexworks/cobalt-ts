/* eslint-disable @typescript-eslint/no-explicit-any */
import {
    IdProvider,
    ProgramError,
    UnknownError,
    extractMessage,
    toJson,
} from "@hexworks/cobalt-core";
import * as E from "fp-ts/Either";
import {
    Do,
    ReaderTaskEither,
    ask,
    bind,
    bindW,
    chain,
    chainW,
    fold,
    fromTask,
    fromTaskEither,
    left,
    map,
    mapLeft,
    orElse,
    right,
} from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { DateTime, Duration } from "luxon";
import { Logger } from "tslog";
import { JsonObject } from "type-fest";
import {
    AnyJob,
    AnyJobDescriptor,
    AnyJobHandler,
    Job,
    JobCancellationFailedError,
    JobContext,
    JobDescriptor,
    JobExecutionError,
    JobRepository,
    JobState,
    NoHandlerFoundError,
    RetryFailedError,
    Scheduler,
    SchedulerNotRunningError,
    SchedulerStartupError,
    SchedulingError,
    Timer,
    UnsavedLog,
} from "../api";
import { HandlerCannotExecuteJobError } from "../api/error/HandlerCannotExecuteJobError";

// eslint-disable-next-line @typescript-eslint/ban-types
export class DefaultScheduler<CONTEXT> implements Scheduler<CONTEXT> {
    private state: "stopped" | "running" | "uninitialized" = "uninitialized";

    constructor(
        private jobRepository: JobRepository<CONTEXT>,
        private handlers: Map<string, AnyJobHandler>,
        private timer: Timer,
        private idProvider: IdProvider<string>,
        private jobCheckInterval: Duration,
        private retryInterval: Duration,
        private logger: Logger<unknown>
    ) {}

    public start() {
        switch (this.state) {
            case "stopped":
                return left(new SchedulerStartupError("Scheduler is stopped."));
            case "running":
                return left(
                    new SchedulerStartupError("Scheduler is already running.")
                );
            case "uninitialized":
                this.state = "running";
                return pipe(
                    this.executeNextJobs(),
                    mapLeft((e) => new SchedulerStartupError(e)),
                    map(() => undefined)
                );
        }
    }

    public addHandler(jobHandler: AnyJobHandler) {
        this.handlers.set(jobHandler.type, jobHandler);
    }

    public stop() {
        this.state = "stopped";
        this.timer.cancel();
        return right(undefined);
    }

    public schedule<D extends JsonObject>(
        job: JobDescriptor<D>
    ): ReaderTaskEither<CONTEXT, SchedulingError, Job<D>> {
        if (this.state !== "running") {
            return left(new SchedulerNotRunningError());
        } else {
            const {
                name,
                data,
                scheduledAt,
                type,
                correlationId = this.idProvider.generateId(),
            } = job;
            return pipe(
                this.findHandler(job),
                chainW(() => {
                    return this.jobRepository.create({
                        correlationId,
                        name,
                        data,
                        scheduledAt,
                        type,
                        state: JobState.SCHEDULED,
                        currentFailCount: 0,
                        log: {
                            note: "Job scheduled.",
                        },
                    });
                })
            );
        }
    }

    public retry<D extends JsonObject>(
        id: string
    ): ReaderTaskEither<CONTEXT, SchedulingError, Job<D>> {
        if (this.state !== "running") {
            return left(new SchedulerNotRunningError());
        } else {
            return pipe(
                Do,
                bind("job", () => this.jobRepository.findById<D>(id)),
                bindW("handler", ({ job }) => this.findHandler(job)),
                chainW(({ job }) => {
                    let result: ReaderTaskEither<
                        CONTEXT,
                        SchedulingError | RetryFailedError,
                        Job<D>
                    >;
                    if (job.state === JobState.FAILED) {
                        let { previouslyScheduledAt, scheduledAt } = job;
                        if (previouslyScheduledAt) {
                            //* 📘 Note that we know that scheduledAt is always greater than previouslyScheduledAt.
                            const diff =
                                scheduledAt.getTime() -
                                previouslyScheduledAt.getTime();
                            previouslyScheduledAt = scheduledAt;
                            scheduledAt = DateTime.fromJSDate(scheduledAt)
                                .plus({
                                    milliseconds: diff * 2, //* 👈 Exponential backoff logic
                                })
                                .toJSDate();
                        } else {
                            previouslyScheduledAt = scheduledAt;
                            scheduledAt = DateTime.fromJSDate(scheduledAt)
                                .plus(this.retryInterval)
                                .toJSDate();
                        }

                        return this.jobRepository.update<D>({
                            id,
                            scheduledAt,
                            previouslyScheduledAt,
                            state: JobState.SCHEDULED,
                            log: {
                                note: "Job rescheduled after failure.",
                            },
                        });
                    } else {
                        result = left(
                            new RetryFailedError(
                                "Job is not in a failed state."
                            )
                        );
                    }
                    return result;
                })
            );
        }
    }

    public cancelById(
        id: string
    ): ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteById(id),
            map(() => true),
            orElse(() => right(false))
        );
    }

    public cancelByCorrelationId(
        id: string
    ): ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteByCorrelationId(id),
            chain((count) => right(count > 0)),
            mapLeft((e) => new JobCancellationFailedError(e))
        );
    }

    private failJob<E extends ProgramError>({
        job,
        log,
    }: {
        job: AnyJob;
        log: UnsavedLog;
        error: E;
    }): ReaderTaskEither<CONTEXT, ProgramError, void> {
        const { id, currentFailCount } = job;
        const result = pipe(
            this.jobRepository.update({
                id,
                currentFailCount: currentFailCount + 1,
                state: JobState.FAILED,
                log,
            }),
            map(() => undefined)
        );
        return result;
    }

    private completeJob(
        job: AnyJob
    ): ReaderTaskEither<CONTEXT, ProgramError, void> {
        let note = `Job ${job.name} completed successfully.`;
        const { id, currentFailCount } = job;
        if (currentFailCount > 0) {
            note = `${note} Clearing fail count.`;
        }
        return pipe(
            this.jobRepository.update({
                id,
                currentFailCount: 0,
                state: JobState.COMPLETED,
                log: {
                    note,
                },
            }),
            map(() => undefined)
        );
    }

    private findHandler(
        job: AnyJobDescriptor
    ): ReaderTaskEither<
        CONTEXT,
        NoHandlerFoundError | HandlerCannotExecuteJobError,
        AnyJobHandler
    > {
        const { type } = job;
        const handler = this.handlers.get(type);
        if (!handler) {
            const error = new NoHandlerFoundError(type);
            this.logger.warn(error.message);
            return left(error);
        }
        if (handler?.canExecute(job)) {
            return right(handler);
        } else {
            const error = new HandlerCannotExecuteJobError(type, job.name);
            this.logger.warn(error.message);
            return left(error);
        }
    }

    private executeJob(
        job: AnyJob
    ): ReaderTaskEither<CONTEXT, ProgramError, void> {
        const scheduler = {
            schedule: this.schedule.bind(this),
            retry: this.retry.bind(this),
        };

        const { id } = job;

        return pipe(
            Do,
            bind("ctx", () => ask<CONTEXT>()),
            bind("job", () => {
                return this.jobRepository.update({
                    id,
                    state: JobState.RUNNING,
                    log: {
                        note: "Starting job...",
                    },
                });
            }),
            bindW("handler", () => this.findHandler(job)),
            bindW("result", ({ handler, ctx }) => {
                this.logger.debug(`Executing job ${job.name}.`);
                const context: JobContext<JsonObject> = {
                    job,
                    schedule: (job) => scheduler.schedule(job)(ctx),
                    retry: (id) => scheduler.retry(id)(ctx),
                };
                return pipe(
                    fromTaskEither(handler.execute(context)),
                    mapLeft((e) => new JobExecutionError(context, handler, e))
                );
            }),
            fold(
                (error): ReaderTaskEither<CONTEXT, ProgramError, void> => {
                    return pipe(
                        this.failJob({
                            job,
                            log: {
                                note: `Job execution failed. Cause: ${error.message}`,
                                type: error.__tag,
                                data: toJson(error),
                            },
                            error,
                        }),
                        chainW(() => {
                            let result: ReaderTaskEither<
                                CONTEXT,
                                ProgramError,
                                void
                            >;
                            if (error.__tag === "JobExecutionError") {
                                result = fromTaskEither(
                                    error.handler.onError(error)
                                );
                            } else {
                                result = left(error);
                            }
                            return result;
                        })
                    );
                },
                ({ handler, result, job, ctx }) => {
                    return pipe(
                        this.completeJob(job),
                        chainW(() => {
                            return fromTaskEither(
                                handler.onResult({
                                    job,
                                    result,
                                    schedule: (job) =>
                                        scheduler.schedule(job)(ctx),
                                    retry: (job) => scheduler.retry(job)(ctx),
                                })
                            );
                        })
                    );
                }
            )
        );
    }

    private executeNextJobs(): ReaderTaskEither<CONTEXT, ProgramError, void> {
        if (this.state !== "running") {
            return fromTask(() => Promise.resolve());
        }

        const exec = this.executeNextJobs.bind(this);

        const callback = (ctx: CONTEXT) => () => {
            exec()(ctx)();
        };

        return pipe(
            ask<CONTEXT>(),
            chain((ctx) =>
                fromTaskEither(
                    TE.tryCatch(
                        async () => {
                            const startedAt = Date.now();
                            const jobs =
                                await this.jobRepository.findNextJobs()(ctx)();
                            if (jobs.size > 0) {
                                this.logger.debug(
                                    `Executing next batch of jobs (${jobs.size}).`
                                );
                            }
                            for (const job of jobs) {
                                try {
                                    const result = await this.executeJob(job)(
                                        ctx
                                    )();
                                    if (E.isRight(result)) {
                                        this.logger.debug(
                                            `Job ${job.name} completed successfully.`
                                        );
                                    } else {
                                        this.logger.error(
                                            `Job failed: ${result.left.message}`
                                        );
                                    }
                                } catch (e) {
                                    this.logger.error(
                                        `Job promise rejected. This is a bug! Reason: ${extractMessage(
                                            e
                                        )}`
                                    );
                                }
                            }
                            const end = Date.now();
                            const passed = end - startedAt;
                            if (
                                passed >
                                this.jobCheckInterval.as("milliseconds")
                            ) {
                                this.logger.warn(
                                    `Job execution took longer (${passed}ms) than the check interval (${this.jobCheckInterval.as(
                                        "milliseconds"
                                    )}ms).`
                                );
                            }
                            if (jobs.size > 0) {
                                this.logger.debug(
                                    `Executed ${jobs.size} jobs in ${passed}ms. Scheduling next batch...`
                                );
                            }
                            this.timer.setTimeout(
                                callback(ctx),
                                this.jobCheckInterval.as("milliseconds")
                            );
                        },
                        (error) => {
                            this.logger.error(
                                "Failed to execute next jobs. This was not supposed to happen, it is probably a bug! Scheduling next batch...",
                                error
                            );
                            this.timer.setTimeout(
                                callback(ctx),
                                this.jobCheckInterval.as("milliseconds")
                            );
                            return new UnknownError(error);
                        }
                    )
                )
            )
        );
    }
}
