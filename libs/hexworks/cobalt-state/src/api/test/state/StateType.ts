export const StateType = {
    Idle: "Idle",
    FillingForm: "FillingForm",
    WaitingForInput: "WaitingForInput",
    Reporting: "Reporting",
} as const;

export type StateType = keyof typeof StateType;
