import { ProgramError } from "@hexworks/cobalt-data";

/**
 * Represents the result of a {@link Job}. You can use the `type` property to
 * create your own result types with discriminated unions.
 * {@see JobResultHandler}
 */
export type JobResult = {
    type: string;
};

export type Success<R> = JobResult & {
    type: "success";
    result: R;
};

export const Success = <R>(result: R): Success<R> => ({
    type: "success",
    result,
});

export type Failure<E extends ProgramError> = JobResult & {
    type: "failure";
    error: E;
};

export const Failure = <E extends ProgramError>(error: E): Failure<E> => ({
    type: "failure",
    error,
});
