import { ZodError, ZodFormattedError } from "zod";
import { ProgramErrorBase } from ".";

/**
 * Use this error to wrap validation errors into a `ProgramError`.
 */
export class ZodValidationError extends ProgramErrorBase<"ZodValidationError"> {
    public errorReport: ZodFormattedError<unknown>;

    constructor(public error: ZodError<unknown>) {
        super({
            __tag: "ZodValidationError",
            message: error.message,
            details: {
                errorReport: error.format(),
            },
        });
        this.errorReport = this.error.format();
    }
}
