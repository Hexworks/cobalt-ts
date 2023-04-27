import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class JobNotFoundError extends ProgramErrorBase<"JobNotFoundError"> {
    constructor(name: string) {
        super({
            __tag: "JobNotFoundError",
            message: `Job with name '${name}' not found.`,
        });
    }
}
