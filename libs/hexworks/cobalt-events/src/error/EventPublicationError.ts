import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class EventPublicationError extends ProgramErrorBase<"EventPublicationError"> {
    constructor(public readonly event: Event) {
        super({
            __tag: "EventPublicationError",
            message: "Failed to publish event.",
        });
    }
}
