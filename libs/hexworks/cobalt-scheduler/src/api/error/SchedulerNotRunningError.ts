import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class SchedulerNotRunningError extends ProgramErrorBase<"SchedulerNotRunningError"> {
    constructor() {
        super({
            __tag: "SchedulerNotRunningError",
            message:
                "The job scheduler is not running. Did you forget to call start?",
        });
    }
}
