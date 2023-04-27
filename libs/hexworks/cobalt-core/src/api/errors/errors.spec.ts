import * as E from "fp-ts/Either";
import { ProgramErrorSchema, safeParse } from "..";

describe("Given an error object", () => {
    describe("without cause", () => {
        it("When decoding it Then it should decode properly", () => {
            const error = {
                __tag: "ProgramError",
                message: "An error occurred",
                details: {
                    becauseOf: "Something went wrong",
                },
            };

            const result = safeParse(ProgramErrorSchema)(error);

            console.log(result);

            expect(result).toEqual(E.right(error));
        });
    });

    describe("with cause", () => {
        it("When decoding it Then it should decode properly", () => {
            const cause = {
                __tag: "ProgramError",
                message: "Some other error occured",
                details: {},
            };

            const error = {
                __tag: "ProgramError",
                message: "An error occurred",
                details: {},
                cause: cause,
            };

            const result = safeParse(ProgramErrorSchema)(error);

            expect(result).toEqual(E.right(error));
        });
    });
});
