import { z } from "zod";
import { BaseState } from "./BaseState";

export const WaitingForInputData = BaseState.extend({
    bumpCount: z.number().int().min(0),
});

export type WaitingForInputData = z.infer<typeof WaitingForInputData>;
