import { Event } from "@hexworks/cobalt-events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyEventWithType<T extends string, E extends Event<T> = any> = E;
