/**
 * Represents the result of a {@link Job}. You can use the `type` property to
 * create your own result types with discriminated unions.
 * {@see JobResultHandler}
 */
export type JobResult = {
    type: string;
};
