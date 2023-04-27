import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-core";

export class StateTransitionError extends ProgramErrorBase<"StateTransitionError"> {
    constructor(from: string, cause: ProgramError) {
        super({
            __tag: "StateTransitionError",
            message: `An error happened during state transition from ${from}: ${cause.message}`,
            cause,
            details: {
                from,
            },
        });
    }
}
