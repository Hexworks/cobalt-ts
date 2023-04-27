import {
    ProgramErrorSchema,
    safeParse,
    safeParseAsync,
} from "@hexworks/cobalt-core";
import { fetch } from "cross-fetch";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import {
    HTTPDataTransferError,
    HTTPRequestError,
    RemoteDataTransferError,
    UnknownDataTransferError,
} from "../api/errors";
import { HttpAdapter } from "../api/HttpAdapter";

export const FetchHttpAdapter = (): HttpAdapter<
    RequestInfo,
    RequestInit,
    Response
> => {
    return {
        fetchJson: (url, schema, params) => {
            return pipe(
                TE.Do,
                TE.bind("result", () =>
                    TE.tryCatch(
                        async () => {
                            const response: Response = await fetch(url, params);
                            const data =
                                params?.method === "OPTIONS" ||
                                params?.method === "HEAD"
                                    ? undefined
                                    : ((await response.json()) as unknown);
                            return { data, response };
                        },
                        (error: unknown) => {
                            if (error instanceof Error) {
                                return new HTTPRequestError(error);
                            } else {
                                return new UnknownDataTransferError(error);
                            }
                        }
                    )
                ),
                TE.bindW("cleanResult", ({ result }) => {
                    const { data, response } = result;
                    if (response.ok) {
                        return TE.right({ data, response });
                    } else {
                        const { status, statusText, url } = response;
                        const result = safeParse(ProgramErrorSchema)(data);
                        if (E.isRight(result)) {
                            const programError = result.right;
                            programError.details = {
                                ...programError.details,
                                status,
                                statusText,
                            };
                            return TE.left(
                                new RemoteDataTransferError(programError)
                            );
                        } else {
                            return TE.left(
                                new HTTPDataTransferError({
                                    status,
                                    statusText,
                                    url,
                                    method: params?.method ?? "GET",
                                })
                            );
                        }
                    }
                }),
                TE.bindW("data", ({ cleanResult }) => {
                    return safeParseAsync(schema)(cleanResult.data);
                }),
                TE.map(({ cleanResult, data }) => {
                    return {
                        data,
                        response: cleanResult.response,
                    };
                })
            );
        },
    };
};
