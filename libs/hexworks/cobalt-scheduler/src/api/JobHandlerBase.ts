import { ProgramError, createLogger } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/TaskEither";
import { Logger } from "tslog";
import { JsonObject } from "type-fest";
import { Schema } from "zod";
import { JobExecutionError } from "./error";
import {
    JobContext,
    JobDescriptor,
    JobExecutionResult,
    JobHandler,
    JobResult,
    OnErrorStrategy,
    OnResultStrategy,
} from "./job";

type Params<DATA extends JsonObject> = {
    type: string;
    /**
     * The schema that is used to validate the input data for the task.
     */
    inputSchema: Schema<DATA>;
    execute(context: JobContext<DATA>): TE.TaskEither<ProgramError, JobResult>;
    logger?: Logger<unknown>;
    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resultStrategies?: OnResultStrategy<DATA, any>[];
    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    errorStrategies?: OnErrorStrategy<DATA, ProgramError>[];
};

export class JobHandlerBase<DATA extends JsonObject>
    implements JobHandler<DATA>
{
    public inputSchema: Schema<DATA>;
    public type: string;
    public execute: (
        context: JobContext<DATA>
    ) => TE.TaskEither<ProgramError, JobResult>;

    protected logger: Logger<unknown>;
    /**
     * Strategies that the handler will choose from to handle the result of the job.
     * {@link JobResult} is the base type of all results, and it contains the `type`
     * field that is used to determine which strategy to use.
     */
    private resultStrategies: OnResultStrategy<DATA, JobResult>[];
    /**
     * Strategies that the handler will choose from to handle if there was an error.
     */
    private errorStrategies: OnErrorStrategy<DATA, ProgramError>[];

    constructor({
        type,
        inputSchema,
        logger,
        execute,
        resultStrategies,
        errorStrategies,
    }: Params<DATA>) {
        this.type = type;
        this.execute = execute;
        this.inputSchema = inputSchema;
        this.logger = logger ?? createLogger("JobHandler");
        this.resultStrategies = resultStrategies ?? [];
        this.errorStrategies = errorStrategies ?? [];
    }

    canExecute(job: JobDescriptor<JsonObject>): job is JobDescriptor<DATA> {
        const result = this.inputSchema.safeParse(job.data);
        if (!result.success) {
            this.logger.warn(
                `Job ${job.name} cannot be executed because the input data is invalid: ${result.error.message}`
            );
        }
        return this.inputSchema.safeParse(job.data).success;
    }

    onResult({ job, result, schedule }: JobExecutionResult<DATA, JobResult>) {
        const strategy = this.resultStrategies.find((s) => s.canHandle(result));
        if (strategy) {
            return strategy.onResult({
                result,
                job,
                schedule,
                data: job.data,
            });
        }
        this.logger.warn(
            `No result strategy found for result: ${result.type}. Job result: ${result.type} is ignored.`
        );
        return TE.right(undefined);
    }

    onError(error: JobExecutionError<DATA>) {
        const job = error.jobContext.job;
        const strategy = this.errorStrategies.find((s) => s.canHandle(error));
        if (strategy) {
            return strategy.onError(error);
        }
        this.logger.warn(`Job ${job.name} failed with: ${error}`);
        return TE.right(undefined);
    }
}

export const createJobHandler = <DATA extends JsonObject>(
    params: Params<DATA>
) => {
    return new JobHandlerBase<DATA>(params);
};
