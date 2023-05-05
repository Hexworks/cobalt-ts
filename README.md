# Cobalt

Need info? Read on!
| or [Create an issue](https://github.com/Hexworks/cobalt-ts/issues/new)
| or [Ask us on Discord](https://discord.com/invite/vSNgvBh)

---

Cobalt is a utilities library for Typescript. You can use it with any TypeScript project including
backend, frontend and mobile apps.

**Note that** this project uses functional programming constructs so it is advised to read up on the relevant projects if you're not familiar with them.

-   [fp-ts](https://github.com/gcanti/fp-ts)

## Packages

This is a list of published packages that you can add to your project. Follow the links if you'd like to learn more about how they work.

-   [Authorization](libs/hexworks/cobalt-authorization/README.md): Authorization utilities
-   [Core](libs/hexworks/cobalt-core/README.md): Core utilities shared by all packages
-   [Events](libs/hexworks/cobalt-events/README.md): In-memory event bus implementation
-   [GraphQL](libs/hexworks/cobalt-graphql/README.md): Functional GraphQL Client
-   [HTTP](libs/hexworks/cobalt-http/README.md): HTTP Utilities
-   [Scheduler](libs/hexworks/cobalt-scheduler/README.md): Scheduling utility
-   [State](libs/hexworks/cobalt-state/README.md): Functional and persistent state machine implementation

## Learning

In case you are not familiar with functional programming and you'd like to learn more about it, you can read up on the following resources:

-   [Practical Guide to Fp-ts](https://rlee.dev/series/practical-guide-to-fp-ts)
-   [Domain modeling in TypeScript](https://dev.to/ruizb/series/11683)
-   [Functional design](https://dev.to/gcanti/series/679)
-   [Interoperability with non functional code using fp-ts](https://dev.to/gcanti/interoperability-with-non-functional-code-using-fp-ts-432e)
-   [Approximating haskell's do syntax in Typescript](https://paulgray.net/do-syntax-in-typescript/)
-   [PaulGray.net (useful FP articles)](https://paulgray.net/)
-   [fp-ts cheatsheet](https://github.com/inato/fp-ts-cheatsheet)
-   [fp-ts overview: Error handling, the functional way](https://troikatech.com/blog/2020/09/24/fp-ts-error-handling-the-functional-way/)
-   [fp-ts and Beautiful API Calls](https://dev.to/gnomff_65/fp-ts-and-beautiful-api-calls-1f55)


## Development

**TODO**

### Publishing

In order to publish the underlying packages of this project you need to do the following:

1. Install the dependencies using `npm install`
2. Run the build script in `script/build-all`
3. Log in to npm: `npm login`
4. Navigate to the specific project in the `dist` directory and run `npm publish --access public`
5. Bump all versions to the next one

You're done!


