import { ProgramError } from "@hexworks/cobalt-core";
import { Context, GetIdType } from "./Context";
import { OperationResult } from "./Operation";
import { User } from "./User";

/**
 * A `Policy` can be used to determine whether an operation can be executed
 * in the given `context`.
 *
 * If the operation is allowed it will return the context.
 * If not, it will return the appropriate error.
 */
export type Policy<
    INPUT,
    DEPENDENCIES,
    USER extends User<ID>,
    ID = GetIdType<USER>
> = (
    context: Context<INPUT, USER, ID>
) => OperationResult<ProgramError, DEPENDENCIES, Context<INPUT, USER, ID>>;
