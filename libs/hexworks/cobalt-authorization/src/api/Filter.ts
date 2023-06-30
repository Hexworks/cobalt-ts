import { ContextOperationResult, User } from ".";
import { Context, GetIdType } from "./Context";

/**
 * A `Filter` can be used to alter the results of an operation after it
 * was executed.
 */
export type Filter<
    DEPENDENCIES,
    RESULT,
    USER extends User<ID>,
    ID = GetIdType<USER>
> = (
    context: Context<RESULT, USER, ID>
) => ContextOperationResult<DEPENDENCIES, RESULT, USER, ID>;
