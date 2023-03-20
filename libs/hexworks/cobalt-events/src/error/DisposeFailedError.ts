import { ProgramErrorBase } from "@hexworks/cobalt-data";

export class DisposeFailedError extends ProgramErrorBase<"DisposeFailedError"> {
    constructor(public readonly because: Error) {
        super({
            __tag: "DisposeFailedError",
            message: `Dispose operation failed: ${because}`,
        });
    }
}
