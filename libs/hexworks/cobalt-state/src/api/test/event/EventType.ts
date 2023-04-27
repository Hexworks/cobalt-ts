export const EventType = {
    BumpSent: "BumpSent",
    FormSubmitted: "FormSubmitted",
    PromptSent: "PromptSent",
    TimedOut: "TimedOut",
    UserInitiatedForm: "UserInitiatedForm",
} as const;

export type EventType = keyof typeof EventType;
