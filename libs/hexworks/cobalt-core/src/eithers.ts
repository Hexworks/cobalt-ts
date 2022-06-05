import { ProgramErrorBase } from "@hexworks/cobalt-data";
import * as E from "fp-ts/Either";

export class ExtractionError extends ProgramErrorBase<"ExtractionError"> {
    constructor(public value: unknown, message: string) {
        super({
            __tag: "ExtractionError",
            message: message,
        });
    }
}

/**
 * Tries to extract a Right value from an Either or throws an exception.
 * Useful for testing.
 */
export const extractRight = <L, R>(either: E.Either<L, R>): R => {
    if (E.isLeft(either)) {
        throw new ExtractionError(
            either.left,
            `The supplied either was a Left.`
        );
    } else {
        return either.right;
    }
};

/**
 * Tries to extract a Left value from an Either or throws an exception.
 * Useful for testing.
 */
export const extractLeft = <L, R>(either: E.Either<L, R>): L => {
    if (E.isLeft(either)) {
        return either.left;
    } else {
        throw new ExtractionError(
            either.right,
            `The supplied either was a Right.`
        );
    }
};
