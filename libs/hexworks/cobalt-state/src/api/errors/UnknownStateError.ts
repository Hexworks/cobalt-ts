import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class UnknownStateError extends ProgramErrorBase<"UnknownStateError"> {
    constructor(public stateName: string) {
        super({
            __tag: "UnknownStateError",
            message: `This dispatcher has no knowledge of state ${stateName}`,
            details: {
                stateName,
            },
        });
    }
}
