import * as t from "io-ts";
import { ProgramError } from "../error";

/**
 * This codec can be used to validate {@link ProgramError}s.
 */
export const programErrorCodec: t.Type<ProgramError> = t.recursion(
    "ProgramError",
    () =>
        t.intersection([
            t.strict({
                __tag: t.string,
                message: t.string,
                details: t.record(t.string, t.unknown),
            }),
            t.partial({
                cause: programErrorCodec,
            }),
        ])
);
