import { ProgramError } from "@hexworks/cobalt-core";
import * as TE from "fp-ts/lib/TaskEither";
import { JsonObject } from "type-fest";
import { JobExecutionError } from "../error";

export type OnErrorStrategy<T extends JsonObject, E extends ProgramError> = {
    canHandle: (error: ProgramError) => error is E;
    onError: (
        error: JobExecutionError<T>
    ) => TE.TaskEither<JobExecutionError<T>, void>;
};
