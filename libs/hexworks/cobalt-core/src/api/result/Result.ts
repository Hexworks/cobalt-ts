import * as E from "fp-ts/Either";
import { ProgramError } from "../errors";

/**
 * Represents the result of a computation that either fails with
 * a {@link ProgramError} or succeeds.
 */
export type Result<L extends ProgramError, R> = E.Either<L, R>;
