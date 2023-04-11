import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobCreationError extends ProgramErrorBase<"JobCreationError"> {
    constructor(cause: unknown) {
        super({
            __tag: "JobCreationError",
            message: `Failed to create job. Cause: ${cause}`,
        });
    }
}
