import { ProgramError, TaskResult } from "@hexworks/cobalt-data";
import { Context } from "./Context";

/**
 * A `Policy` can be used to determine whether an operation can be executed
 * in the given `context`.
 *
 * If the operation is allowed it will return the context.
 * If not, it will return the appropriate error.
 */
export type Policy<I> = (
    context: Context<I>
) => TaskResult<ProgramError, Context<I>>;
