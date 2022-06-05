import * as t from "io-ts";

/**
 * Transforms the given `type` to an optional one.
 *
 * Example:
 *
 * export const userCodec = t.strict({
 *     id: t.string,
 *     age: optional(t.number),
 * });
 */
export const optional = <T extends t.Mixed>(type: T) =>
    t.union([type, t.undefined]);
