/* eslint-disable @typescript-eslint/no-explicit-any */
import { ProgramError } from "@hexworks/cobalt-core";
import * as RTE from "fp-ts/ReaderTaskEither";
import { Authorization, Context } from ".";

/**
 * A prepared operation is an operation that has been adapted to the non-fp world,
 * eg: it is a function that takes a {@link Context} object and returns a `Promise`.
 */
export type PreparedOperation<I, O> = (input: Context<I>) => Promise<O>;

/**
 * The absolute minimum dependencies that an {@link Operation} needs to run.
 */
export type OperationDependencies = {
    /**
     * The authorization information for the operation. This is
     * necessary for the `authorize` function to work.
     */
    authorization: Authorization;
};

/**
 * Adapts an {@link Operation} to the non-fp world. Use this if you want to
 * easily convert an {@link Operation} to a function that can be used from
 * a regular non-fp context.
 */
export type OperationAdapter<I, O, D extends OperationDependencies> = (
    op: Operation<I, O, D>,
    deps: D
) => PreparedOperation<I, O>;

/**
 * Represents an asynchronous operation that takes an arbitrary `input` and returns
 * a wrapped result, that's either a success or a failure. Failure is represented by a
 * {@link ProgramError} object, success is represented by an arbitrary object of type `O`.
 */
export type Operation<I, O, D extends OperationDependencies> = (
    input: I
) => OperationResult<ProgramError, O, D>;

export type OperationResult<
    L extends ProgramError,
    R,
    D
> = RTE.ReaderTaskEither<D, L, R>;
