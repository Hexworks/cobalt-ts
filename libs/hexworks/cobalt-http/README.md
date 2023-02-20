# HTTP Utility for Cobalt

This library wraps Axios with [Functional Programming](https://github.com/gcanti/fp-ts) constructs, and also adds data validation and error handling.

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

Then you can call the appropriate method with the url and the codec:

```ts
const getEvents = get("http://myapi.com/v1/events", Events);

const result = await getEvents();
```

Note, that `get` constructs a function that returns a promise, so you can call it multiple times:

```ts
const once = await getEvents();
const twice = await getEvents();
```

### Custom Parameters

You can pass custom parameters such as headers or authentication information as well:

```ts
get(EVENTS_URL, Events, {
    headers: { hi: "hello" },
});
```

> 📘 Take a look at [RequestConfig](src/http.ts#L72) to see the full list of options.
