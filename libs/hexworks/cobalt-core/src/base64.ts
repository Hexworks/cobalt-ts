import { ProgramErrorBase } from "@hexworks/cobalt-data";
import * as E from "fp-ts/lib/Either";
import { pipe } from "fp-ts/lib/function";
import * as TE from "fp-ts/lib/TaskEither";
import fs from "fs";
import { promisify } from "util";

export class ImageParseError extends ProgramErrorBase<"ImageParseError"> {
    constructor(cause: unknown) {
        super({
            __tag: "ImageParseError",
            message: `Couldn't parse image. Cause: ${
                cause instanceof Error ? cause.message : cause
            }`,
        });
    }
}

/**
 * Encodes an utf-8 string to a base64 string.
 */
export const base64Encode = (str: string): string => {
    return Buffer.from(str, "utf-8").toString("base64");
};

/**
 * Decodes a base64 string to an utf-8 string.
 */
export const base64Decode = (str: string): string => {
    return Buffer.from(str, "base64").toString("utf8");
};

/**
 * Gets the extension of a base64 encoded image
 */
export const getBase64ImageExtension = (
    dataUrl: string
): E.Either<ImageParseError, string> => {
    const parts0 = dataUrl.split("data:image/");
    const rest = parts0[1];
    if (!rest) {
        return E.left(new ImageParseError("Invalid image format"));
    }
    const remaining = rest.split(";");
    const extension = remaining[0];
    if (extension) {
        return E.right(extension);
    } else {
        return E.left(new ImageParseError(new Error("Invalid data url")));
    }
};

/**
 * Gets the base64 encoded image from a data url
 */
export const getBase64Image = (
    dataUrl: string
): E.Either<ImageParseError, string> => {
    const image = dataUrl.split(";base64,").pop();
    if (image) {
        return E.right(image);
    } else {
        throw E.left(new ImageParseError(new Error("Invalid data url")));
    }
};
