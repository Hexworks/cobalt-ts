import * as TE from "fp-ts/TaskEither";
import { ProgramError } from "../error";

/**
 * Represents the result of an **asynchronous** computation that either
 * fails with a {@link ProgramError} or succeeds.
 */
export type TaskResult<L extends ProgramError, R> = TE.TaskEither<L, R>;
