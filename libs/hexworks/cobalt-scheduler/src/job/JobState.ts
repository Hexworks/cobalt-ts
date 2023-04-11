export const JobState = {
    SCHEDULED: "SCHEDULED",
    CANCELED: "CANCELED",
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
} as const;

export type JobState = keyof typeof JobState;
