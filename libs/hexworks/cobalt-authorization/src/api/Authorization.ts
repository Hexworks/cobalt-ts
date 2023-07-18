import { ProgramError, TaskResult } from "@hexworks/cobalt-core";
import * as A from "fp-ts/Array";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/function";
import {
    AnyUser,
    AuthorizationError,
    Context,
    Filter,
    GetIdType,
    Operation,
    OperationDependencies,
    OperationResult,
    Policy,
    Role,
    User,
    getPermissionFilterFor,
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
export type ContextTaskResult<
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = TaskResult<ProgramError, Context<RESULT, USER, ID>>;

export type ContextOperationResult<
    DEPENDENCIES,
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = OperationResult<ProgramError, DEPENDENCIES, Context<RESULT, USER, ID>>;

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
export type AuthorizedOperation<
    INPUT,
    DEPENDENCIES,
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = (
    input: ContextOperationResult<DEPENDENCIES, INPUT, USER, ID>
) => ContextOperationResult<DEPENDENCIES, RESULT, USER, ID> &
    AuthorizedOperationBrand;

/**
 * Takes an {@link Operation} and augments it with the given `authorization` information.
 * After an `Operation` is authorized it is safe to call it with any {@link Context} object.
 */
export const authorize = <
    INPUT,
    DEPENDENCIES extends OperationDependencies,
    RESULT,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
>(
    operation: Operation<INPUT, DEPENDENCIES, RESULT>
): AuthorizedOperation<INPUT, DEPENDENCIES, RESULT, USER, ID> => {
    return ((input: ContextOperationResult<DEPENDENCIES, INPUT, USER, ID>) => {
        return pipe(
            RTE.Do,
            RTE.bind("context", () => input),
            RTE.bindW("deps", () => RTE.ask<DEPENDENCIES>()),
            RTE.chainW(({ context, deps }) => {
                const { authorization } = deps;
                const { currentUser: user } = context;
                const roles = authorization.roles;

                const permissions = pipe(
                    Object.keys(roles),
                    A.filter((role) => user.roles.includes(role)),
                    A.chain((role) => roles[role]?.permissions ?? []),
                    getPermissionFilterFor<
                        INPUT,
                        DEPENDENCIES,
                        RESULT,
                        USER,
                        ID
                    >(operation)
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

                return applyFilters<DEPENDENCIES, RESULT, USER, ID>(
                    filters,
                    result
                );
            })
        );
    }) as AuthorizedOperation<INPUT, DEPENDENCIES, RESULT, USER, ID>;
};

const evaluatePolicies = <INPUT, DEPENDENCIES, USER extends User<ID>, ID>(
    context: Context<INPUT, USER, ID>
) =>
    A.reduce<
        Policy<INPUT, DEPENDENCIES, USER, ID>,
        OperationResult<ProgramError, DEPENDENCIES, Context<INPUT, USER, ID>>
    >(RTE.right(context), (acc, policy) => pipe(acc, RTE.chain(policy)));

const executeOperation = <
    INPUT,
    DEPENDENCIES extends OperationDependencies,
    RESULT,
    USER extends User<ID>,
    ID
>(
    operation: Operation<INPUT, DEPENDENCIES, RESULT>,
    user: USER
) =>
    RTE.chain((context: Context<INPUT, USER, ID>) =>
        pipe(
            operation.execute(context.data),
            RTE.map((output: RESULT) => {
                return {
                    currentUser: user,
                    data: output,
                };
            })
        )
    );

const applyFilters = <DEPENDENCIES, RESULT, USER extends User<ID>, ID>(
    filters: Filter<DEPENDENCIES, RESULT, USER, ID>[],
    result: ContextOperationResult<DEPENDENCIES, RESULT, USER, ID>
) =>
    pipe(
        filters,
        A.reduce<
            Filter<DEPENDENCIES, RESULT, USER, ID>,
            ContextOperationResult<DEPENDENCIES, RESULT, USER, ID>
        >(result, (acc, filter) => pipe(acc, RTE.chain(filter)))
    );
