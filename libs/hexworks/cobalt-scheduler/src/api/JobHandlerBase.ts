import { createLogger } from "@hexworks/cobalt-core";
import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { Logger } from "tslog";
import { JsonObject } from "type-fest";
import { Schema } from "zod";
import {
    JobContext,
    JobDescriptor,
    JobExecutionResult,
    JobHandler,
    JobResult,
    OnErrorStrategy,
    OnResultStrategy,
} from "./job";
import { JobExecutionError } from "./error";

type Params<T extends JsonObject> = {
    type: string;
    /**
     * The schema that is used to validate the input data for the task.
     */
    inputSchema: Schema<T>;
    execute(context: JobContext<T>): TE.TaskEither<ProgramError, JobResult>;
    logger?: Logger<unknown>;
    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    resultStrategies?: OnResultStrategy<T, JobResult>[];
    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    errorStrategies?: OnErrorStrategy<T, ProgramError>[];
};

export class JobHandlerBase<T extends JsonObject> implements JobHandler<T> {
    public inputSchema: Schema<T>;
    public type: string;
    public execute: (
        context: JobContext<T>
    ) => TE.TaskEither<ProgramError, JobResult>;

    protected logger: Logger<unknown>;
    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    private resultStrategies: OnResultStrategy<T, JobResult>[];
    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    private errorStrategies: OnErrorStrategy<T, ProgramError>[];

    constructor({
        type,
        inputSchema,
        logger,
        execute,
        resultStrategies,
        errorStrategies,
    }: Params<T>) {
        this.type = type;
        this.execute = execute;
        this.inputSchema = inputSchema;
        this.logger = logger ?? createLogger("JobHandler");
        this.resultStrategies = resultStrategies ?? [];
        this.errorStrategies = errorStrategies ?? [];
    }

    canExecute(info: JobDescriptor<JsonObject>): info is JobDescriptor<T> {
        return this.inputSchema.safeParse(info.data).success;
    }

    onResult({ job, result, scheduler }: JobExecutionResult<T, JobResult>) {
        const strategy = this.resultStrategies.find((s) => s.canHandle(result));
        if (strategy) {
            return strategy.onResult({
                result,
                job,
                scheduler,
                data: job.data,
            });
        }
        this.logger.warn(
            `No result strategy found for result: ${result.type}. Job result: ${result.type} is ignored.`
        );
        return TE.right(undefined);
    }

    onError(error: JobExecutionError<T>) {
        const job = error.jobContext.job;
        const strategy = this.errorStrategies.find((s) => s.canHandle(error));
        if (strategy) {
            return strategy.onError(error);
        }
        this.logger.warn(`Job ${job.name} failed with: ${error}`);
        return TE.right(undefined);
    }
}

export const createJobHandler = <T extends JsonObject>(params: Params<T>) => {
    return new JobHandlerBase<T>(params);
};