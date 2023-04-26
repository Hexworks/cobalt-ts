import { JobResult } from "./JobResult";

/**
 * After a {@link Job} has been executed, the result is passed to a {@link JobResultHandler}
 * if there is one for the result type. This is useful if you want to do something with the
 * result of a task, e.g. schedule a follow-up task or send events to other systems.
 *
 * Take a look at the `handler` directory to see what the default handlers do.
 */
export type JobResultHandler<T extends JobResult> = {
    type: string;
    canHandle: (result: JobResult) => result is T;
    handle: (result: T) => void;
};
