import {
    ProgramError,
    ProgramErrorBase,
    extractMessage,
} from "@hexworks/cobalt-core";
import { JsonObject } from "type-fest";
import { JobContext, JobHandler } from "../job";

export class JobExecutionError<
    I extends JsonObject,
    E extends ProgramError
> extends ProgramErrorBase<"JobExecutionError"> {
    constructor(
        public jobContext: JobContext<I>,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        public handler: JobHandler<I, any>,
        override cause: E
    ) {
        super({
            __tag: "JobExecutionError",
            message: `Job execution failed. Cause: ${extractMessage(cause)}`,
            cause,
        });
    }
}
