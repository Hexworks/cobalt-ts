import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobStorageError extends ProgramErrorBase<"JobStorageError"> {
    constructor(cause: unknown) {
        super({
            __tag: "JobStorageError",
            message: `Failed to store job. Cause: ${cause}`,
        });
    }
}
