import {
    ApolloClient,
    DocumentNode,
    HttpLink,
    InMemoryCache,
    NormalizedCacheObject,
} from "@apollo/client/core";
import {
    ProgramError,
    TaskResult,
    toCodecValidationError,
    UnknownError,
} from "@hexworks/cobalt-data";
import fetch from "cross-fetch";
import { pipe } from "fp-ts/function";
import * as TE from "fp-ts/TaskEither";
import * as t from "io-ts";
import { GraphQLClient } from "..";

export class ApolloGraphQLClient implements GraphQLClient {
    private readonly client: ApolloClient<NormalizedCacheObject>;

    constructor(uri: string) {
        this.client = new ApolloClient({
            uri: uri,
            link: new HttpLink({ uri: uri, fetch }),
            cache: new InMemoryCache({
                addTypename: false,
            }),
        });
    }

    query<T>(
        query: DocumentNode,
        vars: Record<string, unknown>,
        codec: t.Type<T>
    ): TaskResult<ProgramError, T> {
        return pipe(
            TE.tryCatch(
                async () => {
                    return this.client.query({
                        query: query,
                        variables: vars,
                        fetchPolicy: "no-cache",
                    });
                },
                (e) => new UnknownError(e)
            ),
            TE.chainW((response) => {
                return TE.fromEither(
                    pipe(
                        codec.decode(response.data),
                        toCodecValidationError(
                            "Validating GraphQL result failed."
                        )
                    )
                );
            })
        );
    }
}
