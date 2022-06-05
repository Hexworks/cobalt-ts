import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class AuthorizationError extends ProgramErrorBase<"AuthorizationError"> {
    constructor(message: string) {
        super({
            __tag: "AuthorizationError",
            message: message,
        });
    }
}
