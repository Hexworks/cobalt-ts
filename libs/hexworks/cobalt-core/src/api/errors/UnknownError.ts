import { ProgramErrorBase } from "./ProgramErrorBase";

/**
 * Represents an unknown error condition. Use this if you don't know
 * or don't care about the cause of some error
 */
export class UnknownError extends ProgramErrorBase<"UnknownError"> {
    public unknownCause: unknown;
    constructor(unknownCause: unknown) {
        super({
            __tag: "UnknownError",
            message:
                typeof unknownCause === "string"
                    ? unknownCause
                    : "Some unknown error happened. This is probably a bug.",
            details:
                unknownCause instanceof Error
                    ? {
                          name: unknownCause.name,
                          message: unknownCause.message,
                      }
                    : {
                          unknownCause: String(unknownCause),
                      },
        });
        this.unknownCause = unknownCause;
    }
}
