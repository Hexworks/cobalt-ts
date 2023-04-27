import { ProgramErrorBase } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";

export class UnknownEventError extends ProgramErrorBase<"UnknownEventError"> {
    constructor(public event: Event<string>) {
        super({
            __tag: "UnknownEventError",
            message: `Current state doesn't respond to event ${event.type}`,
            details: {
                eventType: event.type,
            },
        });
    }
}
