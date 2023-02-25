import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import { z } from "zod";
import { FetchHttpAdapter } from "../adapter";
import { HttpClient } from "./HttpClient";

export type HttpMethod =
    | "GET"
    | "DELETE"
    | "HEAD"
    | "OPTIONS"
    | "POST"
    | "PUT"
    | "PATCH";

export const FetchHttpClient = (): HttpClient<
    RequestInfo,
    RequestInit,
    Response
> => {
    const { fetchJson } = FetchHttpAdapter();
    const request =
        <D>(method: HttpMethod) =>
        (url: RequestInfo, schema: z.Schema<D>, params: RequestInit = {}) =>
            pipe(
                fetchJson(url, schema, { ...params, method }),
                TE.map((result) => result.data)
            );

    return {
        fetchJson,
        get: request("GET"),
        post: request("POST"),
        put: request("PUT"),
        delete: request("DELETE"),
        patch: request("PATCH"),
        head: (url, params) =>
            pipe(
                fetchJson(url, z.unknown(), {
                    ...params,
                    method: "HEAD",
                }),
                TE.map((result) => result.response)
            ),
        options: (url, params) =>
            pipe(
                fetchJson(url, z.unknown(), {
                    ...params,
                    method: "OPTIONS",
                }),
                TE.map((result) => result.response)
            ),
    };
};
