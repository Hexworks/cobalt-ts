/* eslint-disable @typescript-eslint/no-explicit-any */
import * as RTE from "fp-ts/ReaderTaskEither";
import {
    AuthorizedOperation,
    Context,
    Operation,
    OperationDependencies,
    Permission,
    Policy,
    PreparedOperation,
} from ".";

/**
 * Shorthand for creating a {@link Policy} that always allows the operation.
 */
export const allowAllPolicy =
    <I, D>(): Policy<I, D> =>
    (context: Context<I>) =>
        RTE.right(context);

/**
 * Creates a {@link Permission} for a given {@link OperationFactory}
 * that allows the operation for all users.
 *
 * Note that the parameter is not an actual `Operation` but rather a constructor
 * function for it. This allows the creation of an {@link Authorization} object
 * in a static manner before the actual operation(s) are created.
 */
export const allow = <
    I,
    O,
    D extends OperationDependencies,
    T extends Operation<I, O, D>
>(
    operation: T
): Permission<I, O, D> => {
    return {
        name: `Allow ${operation.name} for all`,
        operationName: operation.name,
        policies: [allowAllPolicy()],
    };
};

/**
 * Infers a {@link Permission} type from a generic {@link OperationFactory} type.
 */
export type PermissionOf<T> = T extends Operation<infer I, infer O, infer D>
    ? Permission<I, O, D>
    : never;

/**
 * Infers a generic {@link AuthorizedOperation} type from an {@link Operation} type.
 */
export type AuthorizedOperationOf<T> = T extends Operation<
    infer I,
    infer O,
    infer D
>
    ? AuthorizedOperation<I, O, D>
    : never;

/**
 * Infers a generic {@link PreparedOperation} type from an {@link Operation} type.
 */
export type PreparedOperationOf<T> = T extends Operation<infer I, infer O, any>
    ? PreparedOperation<I, O>
    : never;
