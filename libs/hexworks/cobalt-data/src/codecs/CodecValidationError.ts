import * as t from "io-ts";
import * as E from "fp-ts/Either";
import { ProgramErrorBase } from "../error";

/**
 * Use this error to wrap codec validation errors (`Errors`) into a
 * `ProgramError`.
 */
export class CodecValidationError extends ProgramErrorBase<"CodecValidationError"> {
    constructor(message: string, e: t.Errors) {
        super({
            __tag: "CodecValidationError",
            message: message,
            details: {
                errorReport: e.map(
                    (item) => `${item.value} was invalid: ${item.message}`
                ),
            },
        });
    }

    static fromMessage(message: string): CodecValidationError {
        return new CodecValidationError(message, []);
    }
}

/**
 * Returns a function that maps an {@link Either} of codec validation {@link t.Errors}
 * to a {@link CodecValidationError}.
 *
 * Use this in a `pipe`.
 */
export const toCodecValidationError: <T>(
    message: string
) => (fa: E.Either<t.Errors, T>) => E.Either<CodecValidationError, T> = (
    message
) => E.mapLeft((error: t.Errors) => new CodecValidationError(message, error));
