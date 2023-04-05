import { ZodError, ZodFormattedError } from "zod";
import { ProgramErrorBase } from "../error";

/**
 * Use this error to wrap validation errors into a `ProgramError`.
 */
export class ZodValidationError<
    T
> extends ProgramErrorBase<"ZodValidationError"> {
    public errorReport: ZodFormattedError<T>;

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
