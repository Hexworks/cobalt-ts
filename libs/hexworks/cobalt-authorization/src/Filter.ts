import { ContextOperationResult } from ".";
import { Context } from "./Context";

/**
 * A `Filter` can be used to alter the results of an operation after it
 * was executed.
 */
export type Filter<O, D = unknown> = (
    context: Context<O>
) => ContextOperationResult<O, D>;
