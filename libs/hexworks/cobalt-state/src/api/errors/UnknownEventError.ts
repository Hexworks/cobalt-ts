import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class UnknownEventError extends ProgramErrorBase<"UnknownEventError"> {
    constructor(stateName: string, eventType: string) {
        super({
            __tag: "UnknownEventError",
            message: `Current state '${stateName}' doesn't respond to event of type '${eventType}'`,
            details: {
                eventType: eventType,
            },
        });
    }
}
