import { ProgramError, TaskResult } from "@hexworks/cobalt-data";
import * as A from "fp-ts/Array";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import {
    AnyUser,
    AuthorizationError,
    Context,
    Filter,
    getPermissionFilterFor,
    Operation,
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
export interface AuthorizedOperationBrand {
    readonly _: unique symbol;
}

export type ContextTaskEither<T> = TaskResult<ProgramError, Context<T>>;

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
export type AuthorizedOperation<I, O> = (
    input: ContextTaskEither<I>
) => ContextTaskEither<O> & AuthorizedOperationBrand;

/**
 * Takes an {@link Operation} and augments it with the given `authorization` information.
 * After an `Operation` is authorized it is safe to call it with any {@link Context} object.
 */
export const authorize = <I, O, E extends ProgramError>(
    operation: Operation<I, O>,
    authorization: Authorization
): AuthorizedOperation<I, O> => {
    return ((input: TaskResult<E, Context<I>>) => {
        return pipe(
            input,
            TE.chainW((context: Context<I>) => {
                const { currentUser: user } = context;
                const roles = authorization.roles;

                const permissions = pipe(
                    Object.keys(roles),
                    A.filter((role) => user.roles.includes(role)),
                    A.chain((role) => roles[role].permissions),
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
                    return TE.left(
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
    }) as AuthorizedOperation<I, O>;
};

const evaluatePolicies = <I>(context: Context<I>) =>
    A.reduce<Policy<I>, TaskResult<ProgramError, Context<I>>>(
        TE.right(context),
        (acc, policy) => pipe(acc, TE.chain(policy))
    );

const executeOperation = <I, O>(operation: Operation<I, O>, user: AnyUser) =>
    TE.chain((context: Context<I>) =>
        pipe(
            operation.execute(context.data),
            TE.map((output: O) => {
                return {
                    currentUser: user,
                    data: output,
                };
            })
        )
    );

const applyFilters = <O>(
    filters: Filter<O>[],
    result: TaskResult<ProgramError, Context<O>>
) =>
    pipe(
        filters,
        A.reduce<Filter<O>, TaskResult<ProgramError, Context<O>>>(
            result,
            (acc, filter) => pipe(acc, TE.chain(filter))
        )
    );
