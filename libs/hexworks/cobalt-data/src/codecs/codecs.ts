import * as z from "zod";
import { ProgramError } from "../error";

const literalSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);
type Literal = z.infer<typeof literalSchema>;
type Json = Literal | { [key: string]: Json } | Json[];
const JsonValue: z.ZodType<Json> = z.lazy(() =>
    z.union([literalSchema, z.array(JsonValue), z.record(JsonValue)])
);

/**
 * This codec can be used to validate {@link ProgramError}s.
 */
export const programErrorCodec: z.ZodType<ProgramError> = z.object({
    __tag: z.string(),
    message: z.string(),
    details: JsonValue,
    cause: z.lazy(() => programErrorCodec.optional()),
});
