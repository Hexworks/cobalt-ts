import { JsonObject } from "type-fest";
import { JobState } from "./JobState";

/**
 * Contains information about the state of a {@link Job}.
 */
export type JobLog = {
    /**
     * A textual summary of the log entry.
     */
    note: string;
    /**
     * The state of the {@link Job} at the time this log entry was created.
     */
    state: JobState;
    /**
     * The type of the data that is saved to this log entry.
     */
    type?: string;
    /**
     * Additional (optional) freeform information.
     */
    data?: JsonObject;
    /**
     * The time at which this log entry was created.
     */
    createdAt: Date;
};
