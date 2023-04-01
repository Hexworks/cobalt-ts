import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { ZodValidationError } from "./ZodValidationError";

/**
 * Wraps the output of {@link ZodType.safeParse} into an {@link Either}.
 */
export const safeParse =
    <T>(codec: z.ZodType<T>) =>
    (input: unknown): E.Either<ZodValidationError<T>, T> => {
        const result = codec.safeParse(input);
        if (result.success) {
            return E.right(result.data);
        } else {
            return E.left(new ZodValidationError(result.error));
        }
    };

/**
 * Wraps the output of {@link ZodType.safeParseAsync} into a {@link TaskEither}.
 */
export const safeParseAsync =
    <T>(codec: z.ZodType<T>) =>
    (input: unknown): TE.TaskEither<ZodValidationError<T>, T> => {
        return pipe(
            TE.fromTask(() => codec.safeParseAsync(input)),
            TE.chain((result) => {
                if (result.success) {
                    return TE.right(result.data);
                } else {
                    return TE.left(new ZodValidationError(result.error));
                }
            })
        );
    };
