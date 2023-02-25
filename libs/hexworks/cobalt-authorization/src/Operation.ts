import { ProgramError } from "@hexworks/cobalt-data";
import * as RTE from "fp-ts/ReaderTaskEither";

/**
 * Represents an asynchronous operation that takes an arbitrary `input` and returns
 * a wrapped result, that's either a success or a failure. Failure is represented by a
 * {@link ProgramError} object, success is represented by an arbitrary object of type `O`.
 */
export type Operation<I, O, D = unknown> = {
    /**
     * The name of the operation. This has to be unique and it is used to
     * pair permissions to operations.
     */
    name: string;
    execute: (input: I) => OperationResult<ProgramError, O, D>;
};

export type OperationResult<
    L extends ProgramError,
    R,
    D = unknown
> = RTE.ReaderTaskEither<D, L, R>;
