import { z } from "zod";

export const BaseState = z.object({
    id: z.string(),
    userId: z.string(),
});

export type BaseState = z.infer<typeof BaseState>;
