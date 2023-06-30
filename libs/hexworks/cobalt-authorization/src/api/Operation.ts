import { ProgramError } from "@hexworks/cobalt-core";
import * as RTE from "fp-ts/ReaderTaskEither";
import { AnyUser, Authorization, Context, GetIdType, User } from ".";

/**
 * A prepared operation is an operation that has been adapted to the non-fp world,
 * eg: it is a function that takes a {@link Context} object and returns a `Promise`.
 */
export type PreparedOperation<
    INPUT,
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = (input: Context<INPUT, USER, ID>) => Promise<RESULT>;

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
export type OperationAdapter<
    INPUT,
    DEPENDENCIES extends OperationDependencies,
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = (
    op: Operation<INPUT, DEPENDENCIES, RESULT>,
    deps: DEPENDENCIES
) => PreparedOperation<INPUT, RESULT, USER, ID>;

/**
 * Represents an asynchronous operation that takes an arbitrary `input` and returns
 * a wrapped result, that's either a success or a failure. Failure is represented by a
 * {@link ProgramError} object, success is represented by an arbitrary object of type `O`.
 */
export type Operation<
    INPUT,
    DEPENDENCIES extends OperationDependencies,
    RESULT
> = (input: INPUT) => OperationResult<ProgramError, DEPENDENCIES, RESULT>;

export type OperationResult<
    ERROR extends ProgramError,
    DEPENDENCIES,
    RESULT
> = RTE.ReaderTaskEither<DEPENDENCIES, ERROR, RESULT>;
