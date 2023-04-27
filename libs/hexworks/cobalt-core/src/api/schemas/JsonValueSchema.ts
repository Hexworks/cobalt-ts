import { JsonValue } from "type-fest";
import * as z from "zod";
import { JsonPrimitiveSchema } from ".";

/**
 * Zod schema for type-fest's {@link JsonValue}
 */
export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
    z.union([
        JsonPrimitiveSchema,
        z.array(JsonValueSchema),
        z.record(JsonValueSchema),
    ])
);
