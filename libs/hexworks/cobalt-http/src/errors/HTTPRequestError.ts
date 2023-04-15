import { ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Represents an error that happened during the HTTP request (not found for example).
 */
export class HTTPRequestError extends ProgramErrorBase<"HTTPRequestError"> {
    public error: Error;
    constructor(error: Error) {
        super({
            __tag: "HTTPRequestError",
            message: error.message,
            details: {
                name: error.name,
                stack: error.stack ?? null,
            },
        });
        this.error = error;
    }
}
