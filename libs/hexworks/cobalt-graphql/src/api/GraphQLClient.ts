import { DocumentNode } from "@apollo/client/core";
import { ProgramError, TaskResult } from "@hexworks/cobalt-core";
import * as z from "zod";
import { ApolloGraphQLClient } from "../impl";

/**
 * A GraphQL client implementation that can be used to load data
 * from remote GraphQL servers.
 */
export interface GraphQLClient {
    /**
     * Executes the given GraphQL query and returns the result.
     */
    query<T>(
        query: DocumentNode,
        vars: Record<string, unknown>,
        codec: z.Schema<T>
    ): TaskResult<ProgramError, T>;
}

/**
 * Creates a new {@link GraphQLClient} instance that points to the
 * endpoint at the given URL.
 */
export const GraphQLClient = (url: string): GraphQLClient =>
    new ApolloGraphQLClient(url);
