# Authorization Utility for Cobalt

This package provides a simple PBAC (Policy Based Access Control) utility for Cobalt.

## Usage

Let's say that you have a function that you'd like to authorize:

```ts



First you should define your roles:

```ts
export const Role = {
    Anonymous: "Anonymous",
    User: "User",
    Administrator: "Administrator",
} as const;

export type Role = keyof typeof Role;
```

Then 