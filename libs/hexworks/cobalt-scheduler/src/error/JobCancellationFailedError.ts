import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobCancellationFailedError extends ProgramErrorBase<"JobCancellationFailedError"> {
    constructor(cause: unknown) {
        super({
            __tag: "JobCancellationFailedError",
            message: `Job cancellation failed. Cause: ${cause}`,
        });
    }
}
