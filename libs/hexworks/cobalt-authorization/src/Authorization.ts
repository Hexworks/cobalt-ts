import { ProgramError, TaskResult } from "@hexworks/cobalt-data";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as RTE from "fp-ts/ReaderTaskEither";
import {
    AnyUser,
    AuthorizationError,
    Context,
    Filter,
    getPermissionFilterFor,
    Operation,
    OperationDependencies,
    OperationResult,
    Policy,
    Role,
} from ".";

/**
 * Contains authorization information (permissions) for a set of {@link Role}s.
 * The `key` is the **name** of the role.
 */
export interface Authorization {
    roles: {
        [key: string]: Role;
    };
}

/**
 * This brand makes sure that {@link AuthorizedOperation}s can only be created
 * by `authorize`.
 */
export type AuthorizedOperationBrand = {
    readonly _: unique symbol;
};

/**
 * A {@link TaskResult} that contains a {@link Context} object (of type `T`).
 */
export type ContextTaskResult<T> = TaskResult<ProgramError, Context<T>>;

export type ContextOperationResult<O, D> = OperationResult<
    ProgramError,
    Context<O>,
    D
>;

/**
 * An `AuthorizedOperation` is an {@link Operation} that has been authorized
 * with an {@link Authorization} object. It is safe to call from a security
 * perspective with any {@link Context} object.
 *
 * Note that while {@link Operation}s are designed for ease of implementation,
 * {@link AuthorizedOperation}s are designed to be used in a more functional
 * way (eg: with `pipe`).
 *
 * Usage:
 *
 * ```ts
 * const result = pipe(
 *   Either.right<Error, Context<number>>(context),
 *   authorizedFind,
 *   authorizedDelete,
 * )
 * ```
 */
export type AuthorizedOperation<I, O, D> = (
    input: ContextOperationResult<I, D>
) => ContextOperationResult<O, D> & AuthorizedOperationBrand;

/**
 * Takes an {@link Operation} and augments it with the given `authorization` information.
 * After an `Operation` is authorized it is safe to call it with any {@link Context} object.
 */
export const authorize = <I, O, D extends OperationDependencies>(
    operation: Operation<I, O, D>
): AuthorizedOperation<I, O, D> => {
    return ((input: ContextOperationResult<I, D>) => {
        return pipe(
            RTE.Do,
            RTE.bind("context", () => input),
            RTE.bindW("deps", () => RTE.ask<D>()),
            RTE.chainW(({ context, deps }) => {
                const { authorization } = deps;
                const { currentUser: user } = context;
                const roles = authorization.roles;

                const permissions = pipe(
                    Object.keys(roles),
                    A.filter((role) => user.roles.includes(role)),
                    A.chain((role) => roles[role]?.permissions ?? []),
                    getPermissionFilterFor(operation)
                );

                const policies = pipe(
                    permissions,
                    A.chain((permission) => permission.policies)
                );

                const filters = pipe(
                    permissions,
                    A.chain((permission) => permission.filters || [])
                );

                if (policies.length === 0) {
                    return RTE.left(
                        new AuthorizationError(
                            `Current user ${user.name} has no permission to perform ${operation.name}`
                        ) as ProgramError
                    );
                }

                const result = pipe(
                    policies,
                    evaluatePolicies(context),
                    executeOperation(operation, user)
                );

                return applyFilters(filters, result);
            })
        );
    }) as AuthorizedOperation<I, O, D>;
};

const evaluatePolicies = <I, D>(context: Context<I>) =>
    A.reduce<Policy<I, D>, OperationResult<ProgramError, Context<I>, D>>(
        RTE.right(context),
        (acc, policy) => pipe(acc, RTE.chain(policy))
    );

const executeOperation = <I, O, D extends OperationDependencies>(
    operation: Operation<I, O, D>,
    user: AnyUser
) =>
    RTE.chain((context: Context<I>) =>
        pipe(
            operation(context.data),
            RTE.map((output: O) => {
                return {
                    currentUser: user,
                    data: output,
                };
            })
        )
    );

const applyFilters = <O, D>(
    filters: Filter<O, D>[],
    result: ContextOperationResult<O, D>
) =>
    pipe(
        filters,
        A.reduce<Filter<O, D>, ContextOperationResult<O, D>>(
            result,
            (acc, filter) => pipe(acc, RTE.chain(filter))
        )
    );
