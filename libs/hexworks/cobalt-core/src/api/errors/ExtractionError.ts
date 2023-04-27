import { ProgramErrorBase } from "./ProgramErrorBase";

export class ExtractionError extends ProgramErrorBase<"ExtractionError"> {
    constructor(public value: unknown, message: string) {
        super({
            __tag: "ExtractionError",
            message: message,
        });
    }
}
