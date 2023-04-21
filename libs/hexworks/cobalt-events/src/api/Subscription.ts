export type SubscriptionDescriptor = {
    id: string;
    scope: string;
    type: string;
};

export type Subscription = SubscriptionDescriptor & {
    cancel: () => void;
};
