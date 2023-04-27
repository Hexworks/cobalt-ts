import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class AuthorizationError extends ProgramErrorBase<"AuthorizationError"> {
    constructor(message: string) {
        super({
            __tag: "AuthorizationError",
            message: message,
        });
    }
}
