import { Filter } from "./Filter";
import { Operation } from "./Operation";
import { Policy } from "./Policy";

/**
 * A `Permission` determines the constraints of executing an {@link Operation}.
 * More details below:
 *
 * @param name The name of the permission. This is useful when debugging.
 * TODO: and / or mechanism for policies
 * @param policies are evaluated in order, and the `operation` is only allowed
 *                 to execute if a policy allows it. A permission must have at
 *                 least one policy.
 * @param filters are evaluated in order, and they may modify the result of
 *                the `operation`.
 */
export interface Permission<I, O> {
    name: string;
    operationName: string;
    policies: Policy<I>[];
    filters?: Filter<O>[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyPermission = Permission<any, any>;

/**
 * Creates a curried function that can be used to find the applicable
 * {@link Permission}s for a given `operation`.
 *
 * Example:
 * ```ts
 * const permissions = pipe(
 *     Object.keys(roles),
 *     filter((role) => user.roles.includes(role)),
 *     chain((role) => roles[role].permissions),
 *     getPermissionFilterFor(operation)
 * );
 * ```
 */
export const getPermissionFilterFor =
    <I, O, D = unknown>(operation: Operation<I, O, D>) =>
    (permissions: AnyPermission[]): Permission<I, O>[] => {
        return permissions.filter(
            (permission) => permission.operationName === operation.name
        );
    };
