import * as z from "zod";
import { ProgramError } from "../errors";
import { JsonObjectSchema } from "./JsonObjectSchema";

/**
 * Zod schema for {@link ProgramErrorSchema}s.
 */
export const ProgramErrorSchema: z.ZodType<ProgramError> = z.object({
    __tag: z.string(),
    message: z.string(),
    details: JsonObjectSchema,
    cause: z.lazy(() => ProgramErrorSchema.optional()),
});
