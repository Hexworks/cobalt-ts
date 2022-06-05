import { ProgramError, TaskResult } from "@hexworks/cobalt-data";
import { Context } from "./Context";

/**
 * A `Filter` can be used to alter the results of an operation after it
 * was executed.
 */
export type Filter<O> = (
    context: Context<O>
) => TaskResult<ProgramError, Context<O>>;
