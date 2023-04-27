import { IdProvider, createLogger } from "@hexworks/cobalt-core";
import { ProgramError, UnknownError, toJson } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { Duration } from "luxon";
import { JsonObject } from "type-fest";
import {
    AnyJob,
    AnyJobDescriptor,
    AnyJobHandler,
    Job,
    JobCancellationFailedError,
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

const logger = createLogger("Scheduler");

export class DefaultScheduler implements Scheduler {
    private state: "stopped" | "running" | "uninitialized" = "uninitialized";

    constructor(
        private jobRepository: JobRepository,
        private handlers: Map<string, JobHandler<JsonObject>>,
        private timer: Timer,
        private idProvider: IdProvider<string>,
        private jobCheckInterval: Duration
    ) {}

    public start() {
        switch (this.state) {
            case "stopped":
                return TE.left(
                    new SchedulerStartupError("Scheduler is stopped.")
                );
            case "running":
                return TE.left(
                    new SchedulerStartupError("Scheduler is already running.")
                );
            case "uninitialized":
                this.state = "running";
                return pipe(
                    this.executeNextJobs(),
                    TE.mapLeft((e) => new SchedulerStartupError(e)),
                    TE.map(() => undefined)
                );
        }
    }

    public schedule<T extends JsonObject>(
        job: JobDescriptor<T>
    ): TE.TaskEither<SchedulingError<T>, Job<T>> {
        if (this.state !== "running") {
            return TE.left(new SchedulerNotRunningError());
        } else {
            return pipe(
                this.findHandler(job),
                TE.chainW(() => {
                    return this.jobRepository.upsert({
                        ...job,
                        correlationId:
                            job.correlationId ?? this.idProvider.generateId(),
                        state: JobState.SCHEDULED,
                        currentFailCount: 0,
                    });
                })
            );
        }
    }

    cancelByName(
        name: string
    ): TE.TaskEither<JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteByName(name),
            TE.map(() => true),
            TE.orElse(() => TE.right(false))
        );
    }

    cancelByCorrelationId(
        id: string
    ): TE.TaskEither<JobCancellationFailedError, boolean> {
        return pipe(
            this.jobRepository.deleteByCorrelationId(id),
            TE.chain((count) => TE.right(count > 0)),
            TE.mapLeft((e) => new JobCancellationFailedError(e))
        );
    }

    public stop() {
        this.state = "stopped";
        this.timer.cancel();
        return TE.right(undefined);
    }

    private failJob<E extends ProgramError>({
        job,
        log,
        error,
    }: {
        job: AnyJob;
        log: UnsavedLog;
        error: E;
    }): TE.TaskEither<ProgramError, void> {
        return pipe(
            this.jobRepository.upsert({
                ...job,
                state: JobState.FAILED,
                log,
            }),
            TE.chainW(() => TE.left(error))
        );
    }

    private completeJob(job: AnyJob): TE.TaskEither<ProgramError, void> {
        let note = `Job ${job.name} completed successfully.`;
        if (job.currentFailCount > 0) {
            note = `${note} Clearing fail count.`;
        }
        return pipe(
            this.jobRepository.upsert({
                ...job,
                state: JobState.COMPLETED,
                currentFailCount: 0,
                log: {
                    note,
                },
            }),
            TE.map(() => undefined)
        );
    }

    private findHandler(
        job: AnyJobDescriptor
    ): TE.TaskEither<NoHandlerFoundError, AnyJobHandler> {
        const { type } = job;
        const handler = this.handlers.get(type);
        if (handler && handler.canExecute(job)) {
            return TE.right(handler);
        } else {
            logger.warn(`No handler found for job type ${type}.`);
            return TE.left(new NoHandlerFoundError(type));
        }
    }

    private executeJob(job: AnyJob): TE.TaskEither<ProgramError, void> {
        const scheduler = { schedule: this.schedule.bind(this) };

        return pipe(
            TE.Do,
            TE.bind("job", () =>
                this.jobRepository.upsert({
                    ...job,
                    state: JobState.RUNNING,
                    log: {
                        note: "Starting job...",
                    },
                })
            ),
            TE.bindW("handler", () => this.findHandler(job)),
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

    private executeNextJobs(): TE.TaskEither<ProgramError, void> {
        if (this.state !== "running") {
            return TE.fromTask(() => Promise.resolve());
        }

        return TE.tryCatch(
            async () => {
                logger.info("Executing next batch of jobs...");
                const startedAt = Date.now();
                const jobs = await this.jobRepository.findNextJobs()();
                await Promise.allSettled(
                    jobs.map((job) => this.executeJob(job)())
                );
                // TODO: reporting
                const end = Date.now();
                const passed = end - startedAt;
                if (passed > this.jobCheckInterval.milliseconds) {
                    logger.warn(
                        `Job execution took longer (${passed}ms) than the check interval (${this.jobCheckInterval.milliseconds}ms).`
                    );
                }
                logger.info(`Executed jobs in ${passed}ms.`);
                this.timer.setTimeout(
                    this.executeNextJobs.bind(this),
                    this.jobCheckInterval.milliseconds
                );
            },
            (error) => {
                logger.error("Failed to execute next jobs.", error);
                this.timer.setTimeout(
                    this.executeNextJobs.bind(this),
                    this.jobCheckInterval.milliseconds
                );
                return new UnknownError(error);
            }
        );
    }
}
