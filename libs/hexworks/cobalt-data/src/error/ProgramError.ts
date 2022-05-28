/**
 * Common type for program errors. Uses `__tag` to
 * enable the creation of tagged unions.
 */
export type ProgramError = {
    __tag: string;
    message: string;
    details: Record<string, unknown>;
    cause?: ProgramError;
};
