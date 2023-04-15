import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-data";
import { JsonObject } from "type-fest";
import { Scheduler } from "../Scheduler";
import { Job, JobHandler } from "../job";

export class JobExecutionError<
    T extends JsonObject
> extends ProgramErrorBase<"JobExecutionError"> {
    constructor(
        public job: Job<T>,
        public handler: JobHandler<T>,
        public scheduler: Omit<Scheduler, "start" | "stop">,
        public cause: ProgramError
    ) {
        super({
            __tag: "JobExecutionError",
            message: `Job execution failed. Cause: ${cause}`,
            cause,
        });
    }
}
