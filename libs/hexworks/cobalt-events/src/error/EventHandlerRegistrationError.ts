import { ProgramErrorBase } from "@hexworks/cobalt-data";
import { UnsavedHandler } from "../EventBus";

export class EventHandlerRegistrationError extends ProgramErrorBase<"EventHandlerRegistrationError"> {
    constructor(public readonly registration: UnsavedHandler) {
        super({
            __tag: "EventHandlerRegistrationError",
            message: "Failed to register event listener.",
        });
    }
}
