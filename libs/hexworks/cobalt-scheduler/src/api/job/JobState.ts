export const JobState = {
    /**
     * The job is scheduled and will be executed when the time comes.
     */
    SCHEDULED: "SCHEDULED",
    /**
     * The job is currently executing.
     */
    RUNNING: "RUNNING",
    /**
     * The job completed successfully.
     */
    COMPLETED: "COMPLETED",
    /**
     * The job failed with an error.
     */
    FAILED: "FAILED",
    /**
     * An unknown error happened during execution that prevented
     * proper cleanup (for example the node process crashed during exeution).
     */
    UNKNOWN: "UNKNOWN",
} as const;

export type JobState = keyof typeof JobState;
