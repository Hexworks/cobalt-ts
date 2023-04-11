import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobExecutionError extends ProgramErrorBase<"JobExecutionError"> {
    constructor(cause: unknown) {
        super({
            __tag: "JobExecutionError",
            message: `Job execution failed. Cause: ${cause}`,
        });
    }
}
