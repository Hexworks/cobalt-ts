import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-core";
import { JsonObject } from "type-fest";
import { JobContext, JobHandler } from "../job";

export class JobExecutionError<
    T extends JsonObject
> extends ProgramErrorBase<"JobExecutionError"> {
    constructor(
        public jobContext: JobContext<T>,
        public handler: JobHandler<T>,
        override cause: ProgramError
    ) {
        super({
            __tag: "JobExecutionError",
            message: `Job execution failed. Cause: ${cause}`,
            cause,
        });
    }
}
