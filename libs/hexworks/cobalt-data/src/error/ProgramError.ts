import { JsonObject, JsonValue } from "type-fest";

/**
 * Common type for program errors. Uses `__tag` to
 * enable the creation of tagged unions.
 */
export type ProgramError = {
    __tag: string;
    message: string;
    details: JsonValue;
    cause?: ProgramError;
};

export const toJson = (error: ProgramError): JsonObject => {
    return {
        __tag: error.__tag,
        message: error.message,
        details: error.details,
        cause: error.cause ? toJson(error.cause) : null,
    };
};
