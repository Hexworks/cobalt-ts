import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class RetryFailedError extends ProgramErrorBase<"RetryFailedError"> {
    constructor(reason: string) {
        super({
            __tag: "RetryFailedError",
            message: `Retry failed because: ${reason}.`,
        });
    }
}
