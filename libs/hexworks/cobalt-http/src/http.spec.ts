/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { fail } from "@hexworks/cobalt-core";
import { CodecValidationError } from "@hexworks/cobalt-data";
import cuid from "cuid";
import { isLeft, isRight } from "fp-ts/Either";
import * as z from "zod";
import { HTTPRequestError } from "./errors";
import { get, head, options, post, put, patch, del } from "./http";

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

const POST_UPDATE = {
    id: 1,
    title: "foo",
    body: "bar",
    userId: 1,
};

describe("Given a default Http Client", () => {
    test("When fetching a valid todo Then it should be successful", async () => {
        const result = await get(
            "https://jsonplaceholder.typicode.com/todos/1",
            TODO
        )();

        if (isLeft(result)) {
            console.log(result.left);
            fail("Should have been successful");
        } else {
            expect(result.right).toEqual(EXPECTED_TODO);
        }
    });

    test("When fetching a todo with a narrower codec Then the extra fields should be removed", async () => {
        const result = await get(
            "https://jsonplaceholder.typicode.com/todos/1",
            NARROW_TODO
        )();

        if (isLeft(result)) {
            console.log(result.left);
            fail("Should have been successful");
        } else {
            expect(result.right).toEqual(EXPECTED_NARROW_TODO);
        }
    });

    test("When fetching an invalid todo Then it should fail", async () => {
        const result = await get(
            "https://jsonplaceholder.typicode.com/todos/1",
            INVALID_TODO
        )();

        if (isRight(result)) {
            fail("Should have failed.");
        } else {
            expect(result.left).toBeInstanceOf(CodecValidationError);
        }
    });

    test("When fetching from an invalid url Then it should fail", async () => {
        const result = await get(`https://${cuid()}.com/todos/1`, TODO)();

        if (isRight(result)) {
            fail("Should have failed.");
        } else {
            expect(result.left).toBeInstanceOf(HTTPRequestError);
        }
    });

    test("When creating a todo Then it should be successful", async () => {
        const result = await post(
            "https://jsonplaceholder.typicode.com/posts",
            POST,
            {
                body: JSON.stringify(NEW_POST),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            }
        )();

        if (isLeft(result)) {
            console.log(result.left);
            fail("Should have been successful");
        } else {
            const { id, ...rest } = result.right;
            expect(rest).toEqual(NEW_POST);
        }
    });

    test("When performing an options request Then it should be successful", async () => {
        const result = await options(
            "https://jsonplaceholder.typicode.com/posts"
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(
                result.right.headers.get("Access-Control-Allow-Methods")
            ).toEqual("GET,HEAD,PUT,PATCH,POST,DELETE");
        }
    });

    test("When performing a head request Then it should be successful", async () => {
        const result = await head(
            "https://jsonplaceholder.typicode.com/posts"
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(result.right.headers.get("Content-Type")).toEqual(
                "application/json; charset=utf-8"
            );
        }
    });

    test("When performing a put request Then it should be successful", async () => {
        const result = await put(
            "https://jsonplaceholder.typicode.com/posts/1",
            POST,
            {
                body: JSON.stringify(POST_UPDATE),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            }
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(result.right).toEqual(POST_UPDATE);
        }
    });

    test("When performing a patch request Then it should be successful", async () => {
        const result = await patch(
            "https://jsonplaceholder.typicode.com/posts/1",
            POST,
            {
                body: JSON.stringify(POST_UPDATE),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            }
        )();

        if (isLeft(result)) {
            fail("Should have been successful");
        } else {
            expect(result.right).toEqual(POST_UPDATE);
        }
    });

    test("When performing a delete request Then it should be successful", async () => {
        const result = await del(
            "https://jsonplaceholder.typicode.com/posts/1",
            z.object({})
        )();

        if (isLeft(result)) {
            console.log(result.left);
            fail("Should have been successful");
        } else {
            expect(result.right).toEqual({});
        }
    });
});
