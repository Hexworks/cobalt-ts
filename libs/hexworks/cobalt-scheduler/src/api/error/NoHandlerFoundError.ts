import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class NoHandlerFoundError extends ProgramErrorBase<"NoHandlerFoundError"> {
    constructor(type: string) {
        super({
            __tag: "NoHandlerFoundError",
            message: `No handler found for job type '${type}'.`,
        });
    }
}
