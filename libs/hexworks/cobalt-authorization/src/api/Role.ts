import { AnyPermission } from "./Permission";

/**
 * A `Role` is a named group of permissions. It is used to authorize the execution
 * of operations based on the permissions it contains.
 *
 * Each `Role` must have a unique name.
 */
export interface Role {
    name: string;
    permissions: AnyPermission[];
}
