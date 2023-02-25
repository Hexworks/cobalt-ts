import { FetchHttpClient } from "./client";

const DEFAULT_CLIENT = FetchHttpClient();

export const fetch = DEFAULT_CLIENT.fetchJson;

/**
 * Executes a GET request and returns the result.
 */
export const get = DEFAULT_CLIENT.get;

/**
 * Executes a DELETE request and returns the result.
 */
export const del = DEFAULT_CLIENT.delete;

/**
 * Executes a HEAD request and returns the result.
 */
export const head = DEFAULT_CLIENT.head;

/**
 * Executes a OPTIONS request and returns the result.
 */
export const options = DEFAULT_CLIENT.options;

/**
 * Executes a POST request and returns the result.
 */
export const post = DEFAULT_CLIENT.post;

/**
 * Executes a PUT request and returns the result.
 */
export const put = DEFAULT_CLIENT.put;

/**
 * Executes a PATCH request and returns the result.
 */
export const patch = DEFAULT_CLIENT.patch;
