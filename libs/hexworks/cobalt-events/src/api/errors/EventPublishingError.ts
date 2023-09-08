import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-core";
import { Subscription } from "../Subscription";

export type SubscriptionErrorTuple = [
    subscription: Subscription,
    cause: ProgramError
];

export class EventPublishingError extends ProgramErrorBase<"EventPublishingError"> {
    public errors: readonly SubscriptionErrorTuple[];
    constructor(errors: readonly SubscriptionErrorTuple[]) {
        super({
            __tag: "EventPublishingError",
            message: "An error happened during event publishing.",
        });
        this.errors = errors;
    }
}
