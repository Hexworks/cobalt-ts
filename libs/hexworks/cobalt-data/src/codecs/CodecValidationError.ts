import * as E from "fp-ts/Either";
import { ZodError } from "zod";
import { ProgramErrorBase } from "../error";

export type ErrorReport = {
    errors: string[];
    [name: string]: string[];
};

/**
 * Use this error to wrap codec validation errors (`Errors`) into a
 * `ProgramError`.
 */
export class CodecValidationError extends ProgramErrorBase<"CodecValidationError"> {
    constructor(public error: ZodError<unknown>) {
        super({
            __tag: "CodecValidationError",
            message: error.message,
            details: {
                errorReport: error.format(),
            },
        });
    }
}

/**
 * Returns a function that maps an {@link Either} of {@link ZodError}
 * to a {@link CodecValidationError}.
 *
 * Use this in a `pipe`.
 */
export const toCodecValidationError: <T>() => (
    fa: E.Either<ZodError<unknown>, T>
) => E.Either<CodecValidationError, T> = () =>
    E.mapLeft((error: ZodError<unknown>) => new CodecValidationError(error));
