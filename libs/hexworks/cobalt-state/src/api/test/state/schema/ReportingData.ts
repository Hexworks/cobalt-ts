import { z } from "zod";
import { BaseState } from "./BaseState";

export const ReportingData = BaseState.extend({
    data: z.string(),
});

export type ReportingData = z.infer<typeof ReportingData>;
