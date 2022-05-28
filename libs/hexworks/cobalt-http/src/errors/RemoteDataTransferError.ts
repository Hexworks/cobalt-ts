import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Represents an error that happened in the remote system that also uses the
 * {@link ProgramError} abstraction. This means that the remote error was serialized
 * into a `ProgramError` and was deserialized on the receiving end.
 */
export class RemoteDataTransferError extends ProgramErrorBase<string> {
    constructor(error: ProgramError) {
        super(error);
    }
}
