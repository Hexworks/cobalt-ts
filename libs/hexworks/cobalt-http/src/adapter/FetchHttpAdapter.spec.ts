/* eslint-disable @typescript-eslint/no-unused-vars */
import { fail } from "@hexworks/cobalt-core";
import { ZodValidationError } from "@hexworks/cobalt-data";
import { isLeft, isRight } from "fp-ts/lib/Either";
import { z } from "zod";
import { FetchHttpAdapter } from "./FetchHttpAdapter";
import { HTTPRequestError } from "../errors";

const TODO = z.object({
    userId: z.number(),
    id: z.number(),
    title: z.string(),
    completed: z.boolean(),
});

const NARROW_TODO = z.object({
    id: z.number(),
    title: z.string(),
    completed: z.boolean(),
});

const INVALID_TODO = z.object({
    xul: z.number(),
    id: z.number(),
    title: z.string(),
    completed: z.boolean(),
});

const POST = z.object({
    userId: z.number(),
    id: z.number(),
    title: z.string(),
    body: z.string(),
});

const EXPECTED_TODO = {
    userId: 1,
    id: 1,
    title: "delectus aut autem",
    completed: false,
};

const EXPECTED_NARROW_TODO = {
    id: 1,
    title: "delectus aut autem",
    completed: false,
};

const NEW_POST = {
    title: "foo",
    body: "bar",
    userId: 1,
};

const RANDOM_STRING = "jfwklehaiosdhlwioeahfloisewff";

describe("Given a Fetch Http Adapter", () => {
    let target: ReturnType<typeof FetchHttpAdapter>;

    beforeEach(() => {
        target = FetchHttpAdapter();
    });

    test("When fetching a valid todo Then it should be successful", async () => {
        const result = await target.fetchJson(
            "https://jsonplaceholder.typicode.com/todos/1",
            TODO
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(result.right.data).toEqual(EXPECTED_TODO);
        }
    });

    test("When fetching a todo with a narrower codec Then the extra fields should be removed", async () => {
        const result = await target.fetchJson(
            "https://jsonplaceholder.typicode.com/todos/1",
            NARROW_TODO
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(result.right.data).toEqual(EXPECTED_NARROW_TODO);
        }
    });

    test("When fetching an invalid todo Then it should fail", async () => {
        const result = await target.fetchJson(
            "https://jsonplaceholder.typicode.com/todos/1",
            INVALID_TODO
        )();

        if (isRight(result)) {
            fail("Should have failed.");
        } else {
            expect(result.left).toBeInstanceOf(ZodValidationError);
        }
    });

    test("When fetching from an invalid url Then it should fail", async () => {
        const result = await target.fetchJson(
            `https://${RANDOM_STRING}.com/todos/1`,
            TODO
        )();

        if (isRight(result)) {
            fail("Should have failed.");
        } else {
            expect(result.left).toBeInstanceOf(HTTPRequestError);
        }
    });

    test("When creating a todo Then it should be successful", async () => {
        const result = await target.fetchJson(
            "https://jsonplaceholder.typicode.com/posts",
            POST,
            {
                method: "POST",
                body: JSON.stringify(NEW_POST),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            }
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            const { id, ...rest } = result.right.data;
            expect(rest).toEqual(NEW_POST);
        }
    });
});
