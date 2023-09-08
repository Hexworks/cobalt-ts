import {
    ProgramError,
    createLogger,
    extractMessage,
} from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { Logger } from "tslog";
import { JsonObject } from "type-fest";
import { Schema } from "zod";
import {
    JobContext,
    JobDescriptor,
    JobExecutionError,
    JobExecutionResult,
    JobHandler,
    OnErrorStrategy,
    OnResultStrategy,
} from "../api";

export type JobHandlerParams<I extends JsonObject, O> = {
    type: string;
    /**
     * The schema that is used to validate the input data for the task.
     */
    inputSchema: Schema<I>;
    execute(context: JobContext<I>): TE.TaskEither<ProgramError, O>;
    logger?: Logger<unknown>;
    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resultStrategies?: OnResultStrategy<I, any>[];
    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    errorStrategies?: OnErrorStrategy<I, any>[];
};

export class DefaultJobHandler<I extends JsonObject, O>
    implements JobHandler<I, O>
{
    public inputSchema: Schema<I>;
    public type: string;
    public execute: (context: JobContext<I>) => TE.TaskEither<ProgramError, O>;

    protected logger: Logger<unknown>;

    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    private resultStrategies: OnResultStrategy<I, O>[];

    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    private errorStrategies: OnErrorStrategy<I, ProgramError>[];

    constructor({
        type,
        inputSchema,
        logger,
        execute,
        resultStrategies,
        errorStrategies,
    }: JobHandlerParams<I, O>) {
        this.type = type;
        this.execute = execute;
        this.inputSchema = inputSchema;
        this.logger = logger ?? createLogger("JobHandler");
        this.resultStrategies = resultStrategies ?? [];
        this.errorStrategies = errorStrategies ?? [];
    }

    canExecute(job: JobDescriptor<JsonObject>): job is JobDescriptor<I> {
        const result = this.inputSchema.safeParse(job.data);
        if (!result.success) {
            this.logger.warn(
                `Job ${job.name} cannot be executed because the input data is invalid: ${result.error.message}`
            );
        }
        return result.success;
    }

    onResult({ job, result, schedule, retry }: JobExecutionResult<I, O>) {
        const strategy = this.resultStrategies.find((s) => s.canHandle(result));
        if (strategy) {
            return strategy.onResult({
                result,
                job,
                schedule,
                retry,
            });
        }
        this.logger.debug(
            `No result strategy found for result: ${result}. Job result is ignored.`
        );
        return TE.right(undefined);
    }

    onError(error: JobExecutionError<I, ProgramError>) {
        const job = error.jobContext.job;
        const strategy = this.errorStrategies.find((s) =>
            s.canHandle(error.cause)
        );
        if (strategy) {
            return strategy.onError(error);
        }
        this.logger.debug(
            `Job ${job.name} failed with: ${extractMessage(error)}`
        );
        return TE.right(undefined);
    }
}
