import * as TE from "fp-ts/lib/TaskEither";
import * as z from "zod";
import { DataTransferError } from ".";

export type RequestParams = {
    method: string;
};

export type FetchJsonResult<D, R> = {
    data: D;
    response: R;
};

/**
 * A HttpAdapter adapts a specific HTTP library to the needs of the Cobalt HTTP library.
 */
export type HttpAdapter<U, P, R> = {
    fetchJson<D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ): TE.TaskEither<DataTransferError, FetchJsonResult<D, R>>;
};
