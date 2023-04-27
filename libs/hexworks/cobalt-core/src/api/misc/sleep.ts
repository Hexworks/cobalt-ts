import { Task } from "fp-ts/lib/Task";

export const sleep =
    (ms: number): Task<void> =>
    () =>
        new Promise((r) => setTimeout(r, ms));
