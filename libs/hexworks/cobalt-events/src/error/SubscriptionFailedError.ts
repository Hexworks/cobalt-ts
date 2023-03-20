import { ProgramErrorBase } from "@hexworks/cobalt-data";
import { UnsavedSubscription } from "../EventBus";

export class SubscriptionFailedError extends ProgramErrorBase<"SubscriptionFailedError"> {
    constructor(public readonly unsavedSubscription: UnsavedSubscription) {
        super({
            __tag: "SubscriptionFailedError",
            message: "Failed to create subscription.",
        });
    }
}
