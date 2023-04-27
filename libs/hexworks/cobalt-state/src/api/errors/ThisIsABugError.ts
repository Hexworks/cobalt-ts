import { ProgramErrorBase } from "@hexworks/cobalt-core";
import { Event } from "@hexworks/cobalt-events";

export class ThisIsABugError extends ProgramErrorBase<"ThisIsABugError"> {
    constructor(public event: Event<string>, public data: unknown) {
        super({
            __tag: "ThisIsABugError",
            message: `No applicable transition found for Event ${event.type}. This shouldn't be possible as the StateBuilder doesn't let you define an event handler that doesn't have a pass-through case.`,
            details: {
                eventType: event.type,
            },
        });
    }
}
