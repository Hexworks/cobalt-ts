import { AnyUser, User } from ".";

export type GetIdType<T> = T extends User<infer I> ? I : never;

/**
 * A `Context` contains the necessary information for authorizing
 * an {@link Operation}.
 *
 * @param user The user that is trying to execute the operation.
 * @param data The input/output of the operation.
 */
export type Context<
    DATA,
    // eslint-disable-next-line @typescript-eslint/ban-types
    USER extends User<ID> = AnyUser,
    ID = GetIdType<USER>
> = {
    currentUser: USER;
    data: DATA;
};
