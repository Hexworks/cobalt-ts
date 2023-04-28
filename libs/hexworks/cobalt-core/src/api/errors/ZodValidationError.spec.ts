import * as z from "zod";
import { ZodValidationError } from "./ZodValidationError";

const User = z
    .object({
        name: z.string().min(1),
        age: z.number().min(0),
        email: z.string().email(),
        from: z.number(),
        to: z.number(),
        address: z.object({
            street: z.string().min(1),
            city: z.string().min(1),
            zip: z.number().gt(0),
            country: z.string().min(1),
        }),
    })
    .refine((user) => user.from < user.to, "From and to is not OK.");

describe("Given a ZodValidationError", () => {
    test("When", () => {
        const result = User.safeParse({
            name: "",
            age: -1,
            email: "not an email",
            from: 1,
            to: 0,
            address: {
                street: "somewhere 1",
                city: "nowhere",
                zip: 6667,
            },
        });

        if (result.success) {
            throw new Error("Should have failed.");
        } else {
            const report = new ZodValidationError(result.error).errorReport;
            // expect(report._errors).toEqual([]);
        }
    });
});
