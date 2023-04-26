import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class NoHandlerFoundError extends ProgramErrorBase<"NoHandlerFoundError"> {
    constructor(type: string) {
        super({
            __tag: "NoHandlerFoundError",
            message: `No handler found for job type '${type}'.`,
        });
    }
}
