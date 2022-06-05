import { ProgramError, TaskResult } from "@hexworks/cobalt-data";

/**
 * Represents an asynchronous operation that takes an arbitrary `input` and returns
 * a wrapped result, that's either a success or a failure. Failure is represented by a
 * {@link ProgramError} object, success is represented by an arbitrary object of type `O`.
 */
export type Operation<I, O> = {
    /**
     * The name of the operation. This has to be unique and it is used to
     * pair permissions to operations.
     */
    name: string;
    execute: (input: I) => TaskResult<ProgramError, O>;
};
