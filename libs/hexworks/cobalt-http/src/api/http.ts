import { HttpClient } from ".";
import { FetchHttpClient } from "../internal";

let DEFAULT_CLIENT: HttpClient<RequestInfo, RequestInit, Response>;

const getClient = () => {
    if (!DEFAULT_CLIENT) {
        DEFAULT_CLIENT = FetchHttpClient();
    }
    return DEFAULT_CLIENT;
};

export const fetch = getClient().fetchJson;

/**
 * Executes a GET request and returns the result.
 */
export const get = getClient().get;

/**
 * Executes a DELETE request and returns the result.
 */
export const del = getClient().delete;

/**
 * Executes a HEAD request and returns the result.
 */
export const head = getClient().head;

/**
 * Executes a OPTIONS request and returns the result.
 */
export const options = getClient().options;

/**
 * Executes a POST request and returns the result.
 */
export const post = getClient().post;

/**
 * Executes a PUT request and returns the result.
 */
export const put = getClient().put;

/**
 * Executes a PATCH request and returns the result.
 */
export const patch = getClient().patch;
