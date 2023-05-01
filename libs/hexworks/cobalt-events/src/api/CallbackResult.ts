export const SubscriptionOption = {
    Keep: "Keep",
    Cancel: "Cancel",
} as const;

export type SubscriptionOption = keyof typeof SubscriptionOption;

export type CallbackResult = {
    subscription: SubscriptionOption;
};
