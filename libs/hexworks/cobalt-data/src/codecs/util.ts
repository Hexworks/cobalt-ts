import * as E from "fp-ts/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/TaskEither";
import * as z from "zod";
import { CodecValidationError } from "./CodecValidationError";

export const safeParse = <T>(
    codec: z.ZodType<T>,
    input: unknown
): E.Either<CodecValidationError, T> => {
    const result = codec.safeParse(input);
    if (result.success) {
        return E.right(result.data);
    } else {
        return E.left(new CodecValidationError(result.error));
    }
};

export const safeParsePiped =
    <E, T>(codec: z.Schema<T>) =>
    (fa: E.Either<E, T>): E.Either<E | CodecValidationError, T> => {
        return E.chainW((data) => {
            return safeParse(codec, data);
        })(fa);
    };

export const safeParseAsync = <T>(
    codec: z.ZodType<T>,
    input: unknown
): TE.TaskEither<CodecValidationError, T> => {
    return pipe(
        TE.fromTask(() => codec.safeParseAsync(input)),
        TE.chain((result) => {
            if (result.success) {
                return TE.right(result.data);
            } else {
                return TE.left(new CodecValidationError(result.error));
            }
        })
    );
};

export const safeParseAsyncPiped =
    <E, T>(codec: z.Schema<T>) =>
    (fa: TE.TaskEither<E, T>): TE.TaskEither<E | CodecValidationError, T> => {
        return TE.chainW((data) => {
            return safeParseAsync(codec, data);
        })(fa);
    };
