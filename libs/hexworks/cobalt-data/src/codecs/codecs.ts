import { JsonObject, JsonValue } from "type-fest";
import * as z from "zod";
import { ProgramError } from "../error";

const JsonPrimitive = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const JsonValue: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([JsonPrimitive, z.array(JsonValue), z.record(JsonValue)])
);
const JsonObject: z.ZodType<JsonObject> = z
    .record(z.string(), JsonValue)
    .and(z.record(z.string(), JsonValue.or(z.undefined())));

/**
 * This codec can be used to validate {@link ProgramError}s.
 */
export const programErrorCodec: z.ZodType<ProgramError> = z.object({
    __tag: z.string(),
    message: z.string(),
    details: JsonObject,
    cause: z.lazy(() => programErrorCodec.optional()),
});
