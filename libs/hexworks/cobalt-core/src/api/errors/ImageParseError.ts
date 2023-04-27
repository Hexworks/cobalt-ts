import { ProgramErrorBase } from "./ProgramErrorBase";

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
