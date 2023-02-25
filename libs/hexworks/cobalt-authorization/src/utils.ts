/* eslint-disable @typescript-eslint/no-explicit-any */
import { AuthorizedOperation, Context, Operation, Permission, Policy } from ".";
import * as RTE from "fp-ts/ReaderTaskEither";

/**
 * This type will match the shape of any function that can be used to construct
 * an {@link Operation}.
 */
export type OperationFactory = (...args: any[]) => Operation<any, any>;

/**
 * Shorthand for creating a {@link Policy} that always allows the operation.
 */
export const allowAllPolicy =
    <I>(): Policy<I> =>
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
export const allow = <T extends OperationFactory>(opFn: T): PermissionOf<T> => {
    return {
        name: `Allow ${opFn.name} for all`,
        operationName: opFn.name,
        policies: [allowAllPolicy()],
    } as PermissionOf<T>;
};

/**
 * Infers a {@link Permission} type from a generic {@link OperationFactory} type.
 */
export type PermissionOf<T> = T extends (
    ...args: any[]
) => Operation<infer I, infer O>
    ? Permission<I, O>
    : never;

/**
 * Infers a generic {@link AuthorizedOperation} type from a {@link OperationFactory} type.
 */
export type AuthorizedOperationOf<T> = T extends (
    ...args: any[]
) => Operation<infer I, infer O>
    ? AuthorizedOperation<I, O>
    : never;
