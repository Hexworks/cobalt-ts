import { JsonObject } from "type-fest";
import * as z from "zod";
import { JsonValueSchema } from "./JsonValueSchema";

/**
 * Zod schema for type-fest's {@link JsonObject}
 */
export const JsonObjectSchema: z.ZodType<JsonObject> = z
    .record(z.string(), JsonValueSchema)
    .and(z.record(z.string(), JsonValueSchema.or(z.undefined())));
