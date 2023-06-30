/* eslint-disable @typescript-eslint/no-explicit-any */
import * as RTE from "fp-ts/ReaderTaskEither";
import {
    AnyUser,
    AuthorizedOperation,
    Context,
    GetIdType,
    Operation,
    OperationDependencies,
    Permission,
    Policy,
    PreparedOperation,
    User,
} from ".";

/**
 * Shorthand for creating a {@link Policy} that always allows the operation.
 */
export const allowAllPolicy =
    <
        INPUT,
        DEPENDENCIES,
        USER extends User<ID>,
        ID = GetIdType<USER>
    >(): Policy<INPUT, DEPENDENCIES, USER, ID> =>
    (context: Context<INPUT, USER, ID>) =>
        RTE.right(context);

/**
 * Creates a {@link Permission} for a given {@link Operation}
 * that allows the operation for all users.
 *
 * This allows the creation of an {@link Authorization} object
 * in a static manner.
 */
export const allow = <
    INPUT,
    DEPENDENCIES extends OperationDependencies,
    RESULT,
    OP extends Operation<INPUT, DEPENDENCIES, RESULT>,
    USER extends User<ID>,
    ID = GetIdType<USER>
>(
    operation: OP
): Permission<INPUT, DEPENDENCIES, RESULT, USER, ID> => {
    return {
        name: `Allow ${operation.name} for all`,
        operationName: operation.name,
        policies: [allowAllPolicy()],
    };
};

/**
 * Infers a {@link Permission} type from a generic {@link Operation} type.
 */
export type PermissionOf<
    T,
    USER extends User<ID>,
    ID = GetIdType<USER>
> = T extends Operation<infer INPUT, infer DEPENDENCIES, infer RESULT>
    ? Permission<INPUT, DEPENDENCIES, RESULT, USER, ID>
    : never;

/**
 * Infers a generic {@link AuthorizedOperation} type from an {@link Operation} type.
 */
export type AuthorizedOperationOf<
    OP,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = OP extends Operation<infer INPUT, infer DEPENDENCIES, infer RESULT>
    ? AuthorizedOperation<INPUT, DEPENDENCIES, RESULT, USER, ID>
    : never;

/**
 * Infers a generic {@link PreparedOperation} type from an {@link Operation} type.
 */
export type PreparedOperationOf<
    OP,
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = OP extends Operation<infer INPUT, any, infer RESULT>
    ? PreparedOperation<INPUT, RESULT, USER, ID>
    : never;
