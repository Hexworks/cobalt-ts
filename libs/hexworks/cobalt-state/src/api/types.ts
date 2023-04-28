import { Event } from "@hexworks/cobalt-events";

export type AnyEventWithType<T extends string> = Event<T>;
