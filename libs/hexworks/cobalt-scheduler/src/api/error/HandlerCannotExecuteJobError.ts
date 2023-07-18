import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class HandlerCannotExecuteJobError extends ProgramErrorBase<"HandlerCannotExecuteJobError"> {
    constructor(type: string, jobName: string) {
        super({
            __tag: "HandlerCannotExecuteJobError",
            message: `Handler of type ${type} cannot execute job ${jobName}.`,
        });
    }
}
