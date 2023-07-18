import {
    IdProvider,
    ProgramError,
    UnknownError,
    extractMessage,
    toJson,
} from "@hexworks/cobalt-core";
import * as E from "fp-ts/Either";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Duration } from "luxon";
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
    JobHandler,
    JobRepository,
    JobState,
    NoHandlerFoundError,
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
        private handlers: Map<string, JobHandler<JsonObject>>,
        private timer: Timer,
        private idProvider: IdProvider<string>,
        private jobCheckInterval: Duration,
        private logger: Logger<unknown>
    ) {}

    public start() {
        switch (this.state) {
            case "stopped":
                return RTE.left(
                    new SchedulerStartupError("Scheduler is stopped.")
                );
            case "running":
                return RTE.left(
                    new SchedulerStartupError("Scheduler is already running.")
                );
            case "uninitialized":
                this.state = "running";
                return pipe(
                    this.executeNextJobs(),
                    RTE.mapLeft((e) => new SchedulerStartupError(e)),
                    RTE.map(() => undefined)
                );
        }
    }

    public schedule<D extends JsonObject>(
        job: JobDescriptor<D>
    ): RTE.ReaderTaskEither<CONTEXT, SchedulingError, Job<D>> {
        if (this.state !== "running") {
            return RTE.left(new SchedulerNotRunningError());
        } else {
            return pipe(
                this.findHandler(job),
                RTE.chainW(() => {
                    return this.jobRepository.create({
                        ...job,
                        correlationId:
                            job.correlationId ?? this.idProvider.generateId(),
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

    public addHandler<T extends JsonObject>(jobHandler: JobHandler<T>) {
        this.handlers.set(jobHandler.type, jobHandler as AnyJobHandler);
    }

    cancelById(
        id: string
    ): RTE.ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteById(id),
            RTE.map(() => true),
            RTE.orElse(() => RTE.right(false))
        );
    }

    cancelByCorrelationId(
        id: string
    ): RTE.ReaderTaskEither<CONTEXT, JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteByCorrelationId(id),
            RTE.chain((count) => RTE.right(count > 0)),
            RTE.mapLeft((e) => new JobCancellationFailedError(e))
        );
    }

    public stop() {
        this.state = "stopped";
        this.timer.cancel();
        return RTE.right(undefined);
    }

    private failJob<E extends ProgramError>({
        job,
        log,
        error,
    }: {
        job: AnyJob;
        log: UnsavedLog;
        error: E;
    }): RTE.ReaderTaskEither<CONTEXT, ProgramError, void> {
        return pipe(
            this.jobRepository.update({
                ...job,
                state: JobState.FAILED,
                log,
            }),
            RTE.chainW(() => RTE.left(error))
        );
    }

    private completeJob(
        job: AnyJob
    ): RTE.ReaderTaskEither<CONTEXT, ProgramError, void> {
        let note = `Job ${job.name} completed successfully.`;
        if (job.currentFailCount > 0) {
            note = `${note} Clearing fail count.`;
        }
        return pipe(
            this.jobRepository.update({
                ...job,
                state: JobState.COMPLETED,
                currentFailCount: 0,
                log: {
                    note,
                },
            }),
            RTE.map(() => undefined)
        );
    }

    private findHandler(
        job: AnyJobDescriptor
    ): RTE.ReaderTaskEither<
        CONTEXT,
        NoHandlerFoundError | HandlerCannotExecuteJobError,
        AnyJobHandler
    > {
        const { type } = job;
        const handler = this.handlers.get(type);
        if (!handler) {
            const error = new NoHandlerFoundError(type);
            this.logger.warn(error.message);
            return RTE.left(error);
        }
        if (handler?.canExecute(job)) {
            return RTE.right(handler);
        } else {
            const error = new HandlerCannotExecuteJobError(type, job.name);
            this.logger.warn(error.message);
            return RTE.left(error);
        }
    }

    private executeJob(
        job: AnyJob
    ): RTE.ReaderTaskEither<CONTEXT, ProgramError, void> {
        const scheduler = { schedule: this.schedule.bind(this) };
        return pipe(
            RTE.Do,
            RTE.bind("ctx", () => RTE.ask<CONTEXT>()),
            RTE.bind("job", () => {
                return this.jobRepository.update({
                    ...job,
                    state: JobState.RUNNING,
                    log: {
                        note: "Starting job...",
                    },
                });
            }),
            RTE.bindW("handler", () => this.findHandler(job)),
            RTE.bindW("result", ({ handler, ctx }) => {
                this.logger.debug(`Executing job ${job.name}.`);
                const context: JobContext<JsonObject> = {
                    data: job.data,
                    job,
                    schedule: (job) => scheduler.schedule(job)(ctx),
                };
                return pipe(
                    RTE.fromTaskEither(handler.execute(context)),
                    RTE.mapLeft(
                        (e) => new JobExecutionError(context, handler, e)
                    )
                );
            }),
            RTE.fold(
                (error): RTE.ReaderTaskEither<CONTEXT, ProgramError, void> => {
                    switch (error.__tag) {
                        case "JobExecutionError":
                            return RTE.fromTaskEither(
                                error.handler.onError(error)
                            );
                        default:
                            return RTE.left(error);
                    }
                },
                ({ handler, result, job, ctx }) => {
                    return RTE.fromTaskEither(
                        handler.onResult({
                            data: job.data,
                            job,
                            result,
                            schedule: (job) => scheduler.schedule(job)(ctx),
                        })
                    );
                }
            ),
            RTE.fold(
                (error) => {
                    return this.failJob({
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
                    return this.completeJob(job);
                }
            )
        );
    }

    private executeNextJobs(): RTE.ReaderTaskEither<
        CONTEXT,
        ProgramError,
        void
    > {
        if (this.state !== "running") {
            return RTE.fromTask(() => Promise.resolve());
        }

        const exec = this.executeNextJobs.bind(this);

        const callback = (ctx: CONTEXT) => () => {
            exec()(ctx)();
        };

        return pipe(
            RTE.ask<CONTEXT>(),
            RTE.chain((ctx) =>
                RTE.fromTaskEither(
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
                                "Failed to execute next jobs. This was not supposed to happen! Scheduling next batch...",
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
