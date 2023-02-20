import * as z from "zod";
import { ProgramError } from "../error";

/**
 * This codec can be used to validate {@link ProgramError}s.
 */
export const programErrorCodec: z.ZodType<ProgramError> = z.object({
    __tag: z.string(),
    message: z.string(),
    details: z.record(z.unknown()),
    cause: z.lazy(() => programErrorCodec.optional()),
});
