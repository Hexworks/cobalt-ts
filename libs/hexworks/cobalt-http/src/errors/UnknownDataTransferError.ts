import { ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Represents an unknown error that's not recognized by the HTTP utility.
 */
export class UnknownDataTransferError extends ProgramErrorBase<"UnknownDataTransferError"> {
    public error: unknown;
    constructor(error: unknown) {
        super({
            __tag: "UnknownDataTransferError",
            message: `An unknown error happened during data transfer. This is probably a bug.`,
        });
        this.error = error;
    }
}
