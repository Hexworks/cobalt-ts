import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class JobAlreadyExistsError extends ProgramErrorBase<"JobAlreadyExistsError"> {
    constructor(override name: string) {
        super({
            __tag: "JobAlreadyExistsError",
            message: `Job with name ${name} already exists`,
        });
    }
}
