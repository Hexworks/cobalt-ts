/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { extractLeft } from "@hexworks/cobalt-core";
import { CodecValidationError } from "@hexworks/cobalt-data";
import axios, { AxiosError } from "axios";
import MockAdapter from "axios-mock-adapter";
import * as E from "fp-ts/Either";
import * as t from "io-ts";
import { HTTPDataTransferError, RemoteDataTransferError } from "./errors";
import { get, post } from "./http";
axios.defaults.adapter = require("axios/lib/adapters/http");

const Events = t.array(
    t.strict({
        id: t.number,
        name: t.string,
    })
);

const events = [
    {
        id: 1,
        name: "Event 1",
    },
    {
        id: 2,
        name: "Event 2",
    },
];

const eventsWithExtraData = [
    {
        id: 1,
        name: "Event 1",
        extra: 1,
    },
    {
        id: 2,
        name: "Event 2",
        extra: 2,
    },
];

const notEvents = {
    something: "else",
};

const EVENTS_URL = "/events";

describe("Given a http", () => {
    describe("post call", () => {
        it("When it is valid Then it should return a value", async () => {
            const mock = new MockAdapter(axios);

            mock.onPost(EVENTS_URL).reply(200, events);

            const result = await post("/events", Events)();

            expect(result).toEqual(E.right(events));
        });
    });
    describe("get call", () => {
        it("When it is valid Then it should return a value", async () => {
            const mock = new MockAdapter(axios);

            mock.onGet(EVENTS_URL).reply(200, events);

            const result = await get(EVENTS_URL, Events)();

            expect(result).toEqual(E.right(events));
        });

        it("When it is valid with extra data Then it should return the data with the exra bits stripped", async () => {
            const mock = new MockAdapter(axios);

            mock.onGet(EVENTS_URL).reply(200, eventsWithExtraData);

            const result = await get(EVENTS_URL, Events)();

            get(EVENTS_URL, Events, {
                headers: { hi: "hello" },
            });

            expect(result).toEqual(E.right(events));
        });

        it("When the response is invalid Then an error is returned", async () => {
            const mock = new MockAdapter(axios);

            mock.onGet(EVENTS_URL).reply(500, {
                data: notEvents,
            });
            const result = await get(EVENTS_URL, Events)();

            expect(result).toEqual(
                E.left(
                    new CodecValidationError(
                        "HTTP data transfer failed.",
                        extractLeft(Events.decode(notEvents))
                    )
                )
            );
        });

        it("When the response is a program error Then it is properly converted", async () => {
            const mock = new MockAdapter(axios);
            const cause = {
                __tag: "CauseError",
                message: "Something went horribly wrong",
                details: {
                    becauseOf: "Some other reason",
                },
            };
            const error = {
                __tag: "ProgramError",
                message: "Something went wrong",
                details: {
                    becauseOf: "Some reason",
                },
                cause: cause,
            };

            mock.onGet(EVENTS_URL).reply(500, error);
            const result = await get(EVENTS_URL, Events)();

            expect(result).toEqual(E.left(new RemoteDataTransferError(error)));
        });

        it("When the endpoint doesn't exist Then it returns a HTTP error", async () => {
            const badUrl = "http://wersadfwefsdafewfasdfweasd.com";

            let badResult: AxiosError | undefined = undefined;
            try {
                await axios.get(badUrl);
            } catch (e: any) {
                badResult = e;
            }

            const result = await get(badUrl, Events)();

            expect(result).toEqual(
                E.left(new HTTPDataTransferError(badResult!))
            );
        });
    });
});
