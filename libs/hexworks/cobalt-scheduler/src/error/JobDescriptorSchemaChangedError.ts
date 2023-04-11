import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class JobDescriptorSchemaChangedError extends ProgramErrorBase<"JobDescriptorSchemaChangedError"> {
    constructor() {
        super({
            __tag: "JobDescriptorSchemaChangedError",
            message:
                "The schema of the job descriptor has changed after the job was added.",
        });
    }
}
