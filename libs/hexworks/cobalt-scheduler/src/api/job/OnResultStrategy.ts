/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/lib/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionResult } from "./JobContext";

export type OnResultStrategy<I extends JsonObject, O> = {
    canHandle: (result: O) => boolean;
    onResult: (
        context: JobExecutionResult<I, O>
    ) => TE.TaskEither<ProgramError, void>;
};
