import { User } from "@hexworks/cobalt-authorization";

/**
 * The system user is used for events that are not emitted by a user,
 * but by the system itself.
 */
export const SYSTEM_USER: User<unknown> = {
    id: "system",
    name: "System",
    roles: [],
};
