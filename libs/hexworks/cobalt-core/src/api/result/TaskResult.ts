import * as TE from "fp-ts/TaskEither";
import { ProgramError } from "../errors";

/**
 * Represents the result of an **asynchronous** computation that either
 * fails with a {@link ProgramError} or succeeds.
 */
export type TaskResult<ERROR extends ProgramError, RESULT> = TE.TaskEither<
    ERROR,
    RESULT
>;
