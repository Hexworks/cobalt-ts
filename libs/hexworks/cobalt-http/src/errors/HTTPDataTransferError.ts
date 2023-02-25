import { ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Represents a failed HTTP request (eg: code is not 200-299).
 */
export class HTTPDataTransferError extends ProgramErrorBase<"HTTPDataTransferError"> {
    constructor({
        status,
        statusText,
        url,
        method,
    }: {
        status: number;
        statusText: string;
        url: string;
        method: string;
    }) {
        super({
            __tag: "HTTPDataTransferError",
            message: `HTTP data transfer failed.`,
            details: {
                status,
                statusText,
                url,
                method,
            },
        });
    }
}
