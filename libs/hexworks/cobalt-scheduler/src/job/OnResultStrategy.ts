import { ProgramError } from "@hexworks/cobalt-data";
import * as TE from "fp-ts/lib/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionResult } from "./JobContext";
import { JobResult } from "./JobResult";

export type OnResultStrategy<T extends JsonObject, R extends JobResult> = {
    canHandle: (result: JobResult) => result is R;
    onResult: (
        context: JobExecutionResult<T, R>
    ) => TE.TaskEither<ProgramError, void>;
};
