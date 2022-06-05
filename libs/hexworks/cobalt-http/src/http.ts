import {
    CodecValidationError,
    programErrorCodec,
    TaskResult,
} from "@hexworks/cobalt-data";
import axios from "axios";
import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import {
    DataTransferError,
    HTTPDataTransferError,
    InternalDataTransferError,
    RemoteDataTransferError,
    UnknownDataTransferError,
} from "./errors";

const handleError = (error: unknown): DataTransferError => {
    if (axios.isAxiosError(error)) {
        const result = programErrorCodec.decode(error.response?.data);
        if (E.isRight(result)) {
            const programError = result.right;
            programError.details = {
                ...programError.details,
                status: error.response?.status,
                statusText: error.response?.statusText,
            };
            return new RemoteDataTransferError(programError);
        } else {
            return new HTTPDataTransferError(error);
        }
    } else {
        // TODO: this won't happen probably, but who knows...
        if (error instanceof Error) {
            return new InternalDataTransferError(error);
        } else {
            return new UnknownDataTransferError(error);
        }
    }
};

const decodeResponse = <T>(codec: t.Type<T>) => {
    return TE.chainW((data: unknown) => {
        return TE.fromEither(
            pipe(
                codec.decode(data),
                E.mapLeft((e: t.Errors) => {
                    return new CodecValidationError(
                        `Decoding HTTP response failed.`,
                        e
                    );
                })
            )
        );
    });
};

type UserAndPassword = {
    username: string;
    password: string;
};

type ProxyConfig = {
    protocol: string;
    host: string;
    port: number;
    auth?: UserAndPassword;
};

type RequestConfig = {
    /**
     * Custom headers to be sent.
     * Example:
     * ```ts
     * {'X-Requested-With': 'XMLHttpRequest'}
     * ```
     */
    headers?: Record<string, string>;
    /**
     * The URL parameters to be sent with the request.
     * Must be a plain object or a {@link URLSearchParams}
     * **NOTE:** params that are null or undefined are not rendered in the URL.
     */
    params?: Record<string, unknown> | URLSearchParams;
    /**
     * An optional function in charge of serializing `params`
     * (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
     * Example:
     * ```ts
     * paramsSerializer: function (params: unknown): string {
     *     return Qs.stringify(params, {arrayFormat: 'brackets'})
     * }
     * ```
     */
    paramsSerializer?: (params: unknown) => string;
    /**
     * Specifies the number of milliseconds before the request times out.
     * If the request takes longer than `timeout`, the request will be aborted.
     * default is `0` (no timeout)
     */
    timeoutMs?: number;
    /**
     * Indicates whether or not cross-site Access-Control requests
     * should be made using credentials. Default is `false`.
     */
    withCredentials?: boolean;
    /**
     * Indicates that HTTP Basic auth should be used, and supplies credentials.
     * This will set an `Authorization` header, overwriting any existing
     * `Authorization` custom headers you have set using `headers`.
     *
     * Please note that only HTTP Basic auth is configurable through this parameter.
     *
     * or Bearer tokens and such, use `Authorization` custom headers instead.
     *
     * Example:
     * ```ts
     * auth: {
     *     username: 'janedoe',
     *     password: 's00pers3cret'
     * }
     * ```
     */
    auth?: UserAndPassword;
    /**
     * Indicates the type of data that the server will respond with.
     * Default is `json`.
     */
    responseType?: "arraybuffer" | "document" | "json" | "text" | "stream";
    /**
     * Indicates encoding to use for decoding responses (Node.js only).
     * **Note:** Ignored for `responseType` of 'stream' or client-side requests.
     * Default is `utf8`.
     */
    responseEncoding?: string;
    /**
     * The name of the cookie to use as a value for xsrf token.
     * Default is: `XSRF-TOKEN`.
     */
    xsrfCookieName?: string;
    /**
     * The name of the http header that carries the xsrf token value.
     * Default is `X-XSRF-TOKEN`.
     */
    xsrfHeaderName?: string;
    /**
     * Defines the max size of the http response content in bytes allowed in node.js
     */
    maxContentLength?: number;
    /**
     * (Node only option) defines the max size of the http request content in bytes allowed.
     */
    maxBodyLength?: number;
    /**
     * Defines whether to resolve or reject the promise for a given HTTP response status code.
     * If `validateStatus` returns `true` the promise will be resolved; otherwise,
     * the promise will be rejected.
     * Default is `(status: number) => status >= 200 && status < 300`
     */
    validateStatus?: (status: number) => boolean;
    /**
     * Defines the maximum number of redirects to follow in node.js.
     * If set to 0, no redirects will be followed.
     * Default is `5`.
     */
    maxRedirects?: number;
    /**
     * Defines a UNIX Socket to be used in node.js.
     * e.g. '/var/run/docker.sock' to send requests to the docker daemon.
     * Only either `socketPath` or `proxy` can be specified.
     * If both are specified, `socketPath` is used.
     */
    socketPath?: string;
    /**
     * Define a custom agent to be used when performing http requests in node.js.
     * This allows options to be added like `keepAlive` that are not enabled by default.
     *
     * Example:
     * ```ts
     * new http.Agent({ keepAlive: true })
     * ```
     */
    httpAgent?: unknown;
    /**
     * Define a custom agent to be used when performing https requests in node.js.
     * This allows options to be added like `keepAlive` that are not enabled by default.
     *
     * Example:
     * ```ts
     * new http.Agent({ keepAlive: true })
     * ```
     */
    httpsAgent?: unknown;
    /**
     * Defines the hostname, port, and protocol of the proxy server.
     * You can also define your proxy using the conventional `http_proxy` and
     * `https_proxy` environment variables. If you are using environment variables
     * for your proxy configuration, you can also define a `no_proxy` environment
     * variable as a comma-separated list of domains that should not be proxied.
     *
     * Use `false` to disable proxies, ignoring environment variables.
     * `auth` indicates that HTTP Basic auth should be used to connect to the proxy, and
     * supplies credentials.
     *
     * This will set an `Proxy-Authorization` header, overwriting any existing
     * `Proxy-Authorization` custom headers you have set using `headers`.
     * If the proxy server uses HTTPS, then you must set the protocol to `https`.
     */
    proxy?: ProxyConfig;
    /**
     * Indicates whether or not the response body should be decompressed automatically.
     * If set to `true` will also remove the 'content-encoding' header
     * from the responses objects of all decompressed responses.
     *
     * - Node only (XHR cannot turn off decompression)
     */
    decompress?: boolean;
};

type HasData = {
    data?:
        | string
        | Record<string, unknown>
        | ArrayBuffer
        | ArrayBufferView
        | URLSearchParams;
};

type RequestParams<T> = RequestConfig &
    HasData & {
        /**
         * The codec to be used to decode the response of this request.
         */
        codec: t.Type<T>;
        /**
         * The server URL that will be used for the request.
         * Example:
         * ```
         * https://some-domain.com/api/v1/users
         * ```
         */
        url: string;
        method:
            | "GET"
            | "DELETE"
            | "HEAD"
            | "OPTIONS"
            | "POST"
            | "PUT"
            | "PATCH";
    };

export const request = <T>({
    codec,
    ...rest
}: RequestParams<T>): TaskResult<DataTransferError, T> => {
    return pipe(
        TE.tryCatch(
            async () => {
                const { data } = await axios.request(rest);
                return data as unknown;
            },
            (error: unknown) => {
                return handleError(error);
            }
        ),
        decodeResponse(codec)
    );
};

/**
 * Executes a GET request and returns the result.
 */
export const get = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "GET",
        ...params,
    });
};

/**
 * Executes a DELETE request and returns the result.
 */
export const del = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig & HasData = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "DELETE",
        ...params,
    });
};

/**
 * Executes a HEAD request and returns the result.
 */
export const head = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "HEAD",
        ...params,
    });
};

/**
 * Executes a OPTIONS request and returns the result.
 */
export const options = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "OPTIONS",
        ...params,
    });
};

/**
 * Executes a POST request and returns the result.
 */
export const post = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig & HasData = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "POST",
        ...params,
    });
};

/**
 * Executes a PUT request and returns the result.
 */
export const put = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig & HasData = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "PUT",
        ...params,
    });
};

/**
 * Executes a PATCH request and returns the result.
 */
export const patch = <T>(
    url: string,
    /**
     * The codec to be used to decode the response of this request.
     */
    codec: t.Type<T>,
    params: RequestConfig & HasData = {}
): TaskResult<DataTransferError, T> => {
    return request({
        url,
        codec,
        method: "PATCH",
        ...params,
    });
};
