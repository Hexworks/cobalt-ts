import { TaskResult } from "@hexworks/cobalt-data";
import * as z from "zod";
import { HttpAdapter } from "../adapter";
import { DataTransferError } from "../errors";

export type HttpClient<U, P, R> = HttpAdapter<U, P, R> & {
    /**
     * Executes a GET request and returns the result.
     */
    get: <D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ) => TaskResult<DataTransferError, D>;

    /**
     * Executes a POST request and returns the result.
     */
    post: <D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ) => TaskResult<DataTransferError, D>;

    /**
     * Executes a PUT request and returns the result.
     */
    put: <D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ) => TaskResult<DataTransferError, D>;

    /**
     * Executes a PATCH request and returns the result.
     */
    patch: <D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ) => TaskResult<DataTransferError, D>;

    /**
     * Executes a DELETE request and returns the result.
     */
    delete: <D>(
        url: U,
        schema: z.Schema<D>,
        params?: P
    ) => TaskResult<DataTransferError, D>;

    /**
     * Executes a HEAD request and returns the result.
     */
    head: (url: U, params?: P) => TaskResult<DataTransferError, R>;

    /**
     * Executes an OPTIONS request and returns the result.
     */
    options: (url: U, params?: P) => TaskResult<DataTransferError, R>;
};
