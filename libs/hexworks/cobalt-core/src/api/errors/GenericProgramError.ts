import { ProgramErrorBase } from "./ProgramErrorBase";

export class GenericProgramError extends ProgramErrorBase<"GenericProgramError"> {
    constructor(message: string) {
        super({
            __tag: "GenericProgramError",
            message: message,
        });
    }
}
