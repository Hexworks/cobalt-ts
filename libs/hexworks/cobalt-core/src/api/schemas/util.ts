import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import * as RTE from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import * as z from "zod";
import { ZodValidationError } from "../errors/ZodValidationError";

/**
 * Wraps the output of {@link ZodType.safeParse} into an {@link Either}.
 */
export const safeParse =
    <T>(schema: z.Schema<T, z.ZodTypeDef, unknown>) =>
    (input: unknown): E.Either<ZodValidationError, T> => {
        const result = schema.safeParse(input);
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
    <T>(schema: z.ZodType<T, z.ZodTypeDef, unknown>) =>
    (input: unknown): TE.TaskEither<ZodValidationError, T> => {
        return pipe(
            TE.fromTask(() => schema.safeParseAsync(input)),
            TE.chain((result) => {
                if (result.success) {
                    return TE.right(result.data);
                } else {
                    return TE.left(new ZodValidationError(result.error));
                }
            })
        );
    };

/**
 * Wraps the output of {@link ZodType.safeParseAsync} into a {@link ReaderTaskEither}.
 */
export const safeParseRTE =
    <T, R>(schema: z.ZodType<T, z.ZodTypeDef, unknown>) =>
    (input: unknown): RTE.ReaderTaskEither<R, ZodValidationError, T> => {
        return pipe(safeParseAsync(schema)(input), RTE.fromTaskEither);
    };
