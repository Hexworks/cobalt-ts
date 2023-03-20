import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class EventSchemaNotRegisteredError extends ProgramErrorBase<"EventSchemaNotRegisteredError"> {
    constructor(public readonly event: Event) {
        super({
            __tag: "EventSchemaNotRegisteredError",
            message: "No schema was registered for this event.",
        });
    }
}
