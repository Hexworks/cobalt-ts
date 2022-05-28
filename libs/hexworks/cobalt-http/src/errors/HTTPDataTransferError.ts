import { ProgramErrorBase } from "@hexworks/cobalt-data";
import { AxiosError } from "axios";

/**
 * Represents an error condition in the underlying HTTP transport utility (Axios).
 */
export class HTTPDataTransferError extends ProgramErrorBase<"HTTPDataTransferError"> {
    public error: AxiosError;
    constructor(error: AxiosError) {
        super({
            __tag: "HTTPDataTransferError",
            message: `HTTP data transfer failed.`,
            details: {
                status: error.response?.status,
                statusText: error.response?.statusText,
                url: error.config.url,
                method: error.config.method,
            },
        });
        this.error = error;
    }
}
