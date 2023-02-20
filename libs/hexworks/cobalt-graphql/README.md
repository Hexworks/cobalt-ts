# GraphQL Client for Cobalt

This library wraps the Apollo GraphQL Client with [Functional Programming](https://github.com/gcanti/fp-ts) constructs, and also adds data validation and error handling.

## Usage:

> 📘 Note that this library uses [io-ts](https://github.com/gcanti/io-ts) for data valiation.

First, you have to create an _io-ts_ codec that represents the data that you'll receive:

```ts
import * as z from "zod";

const Events = t.array(
    t.strict({
        id: t.number,
        name: t.string,
    })
);
```

a GraphQL query:

```ts
import { DocumentNode } from "graphql";
import gql from "graphql-tag";

const query: DocumentNode = gql`
    query events($limit: Int) {
        events(first: $limitF) {
            id
            name
        }
    }
`;
```

and the corresponding client:

```ts
import { createGraphQLClient } from "@hexworks/cobalt-graphql";

const client = createGraphQLClient(URL);
```

Then you can call `query` to get your result:

```ts
const result = client.query(query, { limit: 10}, this.codec))
```
