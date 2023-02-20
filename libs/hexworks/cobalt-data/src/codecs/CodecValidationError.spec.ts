import * as z from "zod";

const x = z
    .object({
        name: z.string().min(1),
        age: z.number().min(0),
        email: z.string().email(),
        from: z.number(),
        to: z.number(),
    })
    .refine((x) => x.from < x.to, "fuck you");

describe("Given a CodecValidationError", () => {
    test("When", () => {
        const result = x.safeParse({
            name: "",
            age: -1,
            email: "not an email",
            from: 1,
            to: 0,
        });
    });
});
