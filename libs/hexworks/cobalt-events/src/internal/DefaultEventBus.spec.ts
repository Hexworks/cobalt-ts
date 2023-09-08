/* eslint-disable @typescript-eslint/no-unused-vars */
import { IdProvider, UnknownError, fail } from "@hexworks/cobalt-core";
import { randomUUID } from "crypto";
import * as E from "fp-ts/Either";
import * as TE from "fp-ts/TaskEither";
import { List } from "immutable";
import { MockProxy, mock } from "jest-mock-extended";
import { DEFAULT_EVENT_SCOPE, Event, SubscriptionOption } from "../api";
import { EventPublishingError } from "../api/errors";
import { DefaultEventBus } from "./DefaultEventBus";

const TEST_EVENT_TYPE = "test" as const;

class TestEvent implements Event<"test"> {
    public type = TEST_EVENT_TYPE;

    constructor(public readonly data: string) {}
}

describe("Given an event bus", () => {
    let target: DefaultEventBus;
    let idProvider: MockProxy<IdProvider<string>>;

    beforeEach(() => {
        idProvider = mock<IdProvider<string>>();
        target = new DefaultEventBus(idProvider);
    });

    describe("When there is an error when publishing an event", () => {
        const error0 = new UnknownError("error0");
        const error1 = new UnknownError("error1");

        test("Then I get the error(s) back", async () => {
            const id = randomUUID();
            idProvider.generateId.mockReturnValue(id);

            target.subscribe(TEST_EVENT_TYPE, () => {
                return TE.left(error0);
            });

            target.subscribe(TEST_EVENT_TYPE, () => {
                return TE.left(error1);
            });

            target.subscribe(TEST_EVENT_TYPE, () => {
                return TE.right({
                    subscription: SubscriptionOption.Keep,
                });
            });

            const result = await target.publish(new TestEvent("hello"))();

            if (E.isRight(result)) {
                fail("Expected error");
            } else {
                expect(result.left).toBeInstanceOf(EventPublishingError);
                expect(result.left.errors.map((e) => e[1].message)).toEqual([
                    error0.message,
                    error1.message,
                ]);
            }
        });

        test("Then the remaining subscriptions are executed", async () => {
            const id = randomUUID();
            idProvider.generateId.mockReturnValue(id);

            let calls = 0;

            target.subscribe(TEST_EVENT_TYPE, () => {
                calls++;
                return TE.left(error0);
            });

            target.subscribe(TEST_EVENT_TYPE, () => {
                calls++;
                return TE.left(error1);
            });

            target.subscribe(TEST_EVENT_TYPE, () => {
                calls++;
                return TE.right({
                    subscription: "Keep",
                });
            });

            const result = await target.publish(new TestEvent("hello"))();

            if (E.isRight(result)) {
                fail("Expected error");
            } else {
                expect(calls).toEqual(3);
                expect(result.left.errors.length).toEqual(2);
            }
        });
    });

    describe("When subscribing to a test event", () => {
        test("Then I get the proper subscription back", () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            const { cancel, ...rest } = target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    return TE.right({
                        subscription: "Keep",
                    });
                }
            );

            expect(rest).toEqual({
                id,
                scope: DEFAULT_EVENT_SCOPE,
                type: TEST_EVENT_TYPE,
            });
        });

        test("Then I can properly query the subscribers", () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                return TE.right({
                    subscription: "Keep",
                });
            });

            const result = target.fetchSubscribersOf(TEST_EVENT_TYPE);

            expect(result.map(({ cancel, ...rest }) => rest)).toEqual(
                List.of({
                    id,
                    scope: DEFAULT_EVENT_SCOPE,
                    type: TEST_EVENT_TYPE,
                })
            );
        });

        test("Then I get notified when the event is fired", async () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            let calls = 0;

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Keep",
                });
            });

            await target.publish(new TestEvent("hello"))();

            expect(calls).toBe(1);
        });

        test("Then I don't get notified when the event is fired twice and I return 'Cancel' from the callback", async () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            let calls = 0;

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Cancel",
                });
            });

            await target.publish(new TestEvent("hello"))();
            await target.publish(new TestEvent("hello"))();

            expect(calls).toBe(1);
        });
    });

    describe("When I have multiple subscribers for an event", () => {
        test("Then I get notified when the event is fired", async () => {
            const id1 = "1";
            const id2 = "2";

            idProvider.generateId
                .mockReturnValueOnce(id1)
                .mockReturnValueOnce(id2);

            let calls = 0;

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Keep",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Keep",
                });
            });

            await target.publish(new TestEvent("hello"))();

            expect(calls).toBe(2);
        });

        test("Then I don't get notified when the event is fired twice and I return 'Cancel' from the callback", async () => {
            const id1 = "1";
            const id2 = "2";

            idProvider.generateId
                .mockReturnValueOnce(id1)
                .mockReturnValueOnce(id2);

            let calls = 0;

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Cancel",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return TE.right({
                    subscription: "Cancel",
                });
            });

            await target.publish(new TestEvent("hello"))();
            await target.publish(new TestEvent("hello"))();

            expect(calls).toBe(2);
        });

        test("Then each listener will get notified accordingly when one stays subscribed, and the other cancels", async () => {
            const id1 = "1";
            const id2 = "2";

            idProvider.generateId
                .mockReturnValueOnce(id1)
                .mockReturnValueOnce(id2);

            let firstCalls = 0;
            let secondCalls = 0;

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                firstCalls++;
                return TE.right({
                    subscription: "Keep",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                secondCalls++;
                return TE.right({
                    subscription: "Cancel",
                });
            });

            await target.publish(new TestEvent("hello"))();
            await target.publish(new TestEvent("hello"))();

            expect(firstCalls).toBe(2);
            expect(secondCalls).toBe(1);
        });
    });

    describe("When subscribing to an event with a scope", () => {
        test("Then I get notified when the event is fired with that scope", async () => {
            idProvider.generateId.mockReturnValue("1");

            let calls = 0;

            target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    calls++;
                    return TE.right({
                        subscription: "Keep",
                    });
                },
                "foo"
            );

            await target.publish(new TestEvent("hello"))();
            await target.publish(new TestEvent("hello"), "foo")();

            expect(calls).toBe(1);
        });

        test("Then querying the improper scope will not return subscribers", () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                return TE.right({
                    subscription: "Keep",
                });
            });

            const result = target.fetchSubscribersOf(TEST_EVENT_TYPE, "foo");

            expect(result).toEqual(List.of());
        });

        test("Then canceling the scope destroys the subscriptions", () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                return TE.right({
                    subscription: "Keep",
                });
            });

            target.cancelScope(DEFAULT_EVENT_SCOPE);

            const result = target.fetchSubscribersOf(TEST_EVENT_TYPE);

            expect(result).toEqual(List.of());
        });

        test("Then canceling another scope keeps the subscriptions", () => {
            idProvider.generateId
                .mockReturnValueOnce("1")
                .mockReturnValueOnce("2");

            target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    return TE.right({
                        subscription: "Keep",
                    });
                },
                DEFAULT_EVENT_SCOPE
            );

            target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    return TE.right({
                        subscription: "Keep",
                    });
                },
                "foo"
            );

            target.cancelScope("foo");

            const result = target.fetchSubscribersOf(
                TEST_EVENT_TYPE,
                DEFAULT_EVENT_SCOPE
            );

            expect(result.map(({ cancel, ...rest }) => rest)).toEqual(
                List.of({
                    id: "1",
                    scope: DEFAULT_EVENT_SCOPE,
                    type: TEST_EVENT_TYPE,
                })
            );
        });
    });
});
