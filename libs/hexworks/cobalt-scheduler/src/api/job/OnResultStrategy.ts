import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/lib/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionResult } from "./JobContext";
import { JobResult } from "./JobResult";

export type OnResultStrategy<
    INPUT extends JsonObject,
    OUTPUT extends JobResult
> = {
    canHandle: (result: JobResult) => result is OUTPUT;
    onResult: (
        context: JobExecutionResult<INPUT, OUTPUT>
    ) => TE.TaskEither<ProgramError, void>;
};
