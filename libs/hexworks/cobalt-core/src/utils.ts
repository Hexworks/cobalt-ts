import { ProgramErrorBase } from "@hexworks/cobalt-data";

/**
 * Type guard for a value `T` that will only allow non-empty (non-null and non-undefined) values.
 */
export function notEmpty<T>(value: T | null | undefined): value is T {
    return value !== null && value !== undefined;
}

/**
 * Throws a new `Error` with the given `msg`.
 */
export const throwError = (msg: string): never => {
    throw new GenericProgramError(msg);
};

/**
 * Tries to convert a `string` to a primitive value (`string`, `number`, `boolean`).
 */
export const coercePrimitive = (value: string): string | number | boolean => {
    if (value === "true") {
        return true;
    }
    if (value === "false") {
        return false;
    }

    const int = parseInt(value);

    if (!isNaN(int)) {
        return int;
    }

    const float = parseFloat(value);

    if (!isNaN(float)) {
        return float;
    }

    return value;
};

class GenericProgramError extends ProgramErrorBase<"GenericProgramError"> {
    constructor(message: string) {
        super({
            __tag: "GenericProgramError",
            message: message,
        });
    }
}
