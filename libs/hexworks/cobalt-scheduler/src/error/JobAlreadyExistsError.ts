import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobAlreadyExistsError extends ProgramErrorBase<"JobAlreadyExistsError"> {
    constructor(public name: string) {
        super({
            __tag: "JobAlreadyExistsError",
            message: `Job with name ${name} already exists`,
        });
    }
}
