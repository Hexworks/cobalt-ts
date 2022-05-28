import { ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Represents an error condition that happened inside the application (not during HTTP transport).
 */
export class InternalDataTransferError extends ProgramErrorBase<"InternalDataTransferError"> {
    public error: Error;
    constructor(error: Error) {
        super({
            __tag: "InternalDataTransferError",
            message: `Data transfer failed`,
            details: {
                message: error.message,
                name: error.name,
            },
        });
        this.error = error;
    }
}
