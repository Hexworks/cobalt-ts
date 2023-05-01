import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class StateInstanceNotFoundError extends ProgramErrorBase<"StateNotFoundError"> {
    constructor(public correlationId: string) {
        super({
            __tag: "StateNotFoundError",
            message: `State instance with correlation id ${correlationId} not found.`,
            details: {
                correlationId,
            },
        });
    }
}
