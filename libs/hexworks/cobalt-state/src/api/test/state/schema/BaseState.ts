import { z } from "zod";

export const BaseState = z.object({
    userId: z.string(),
    key: z.string(),
});

export type BaseState = z.infer<typeof BaseState>;
