import { JsonObject, JsonValue } from "type-fest";
import * as z from "zod";

/**
 * Zod schema for type-fest's {@link JsonPrimitiveSchema}
 */
export const JsonPrimitiveSchema = z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
]);
