import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/lib/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionError } from "../error";

export type OnErrorStrategy<
    DATA extends JsonObject,
    ERROR extends ProgramError
> = {
    canHandle: (error: ProgramError) => error is ERROR;
    onError: (
        error: JobExecutionError<DATA>
    ) => TE.TaskEither<JobExecutionError<DATA>, void>;
};
