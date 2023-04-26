/* eslint-disable @typescript-eslint/no-unused-vars */
import { IdProvider } from "@hexworks/cobalt-core";
import * as T from "fp-ts/lib/Task";
import { MockProxy, mock } from "jest-mock-extended";
import { DEFAULT_EVENT_SCOPE, Event } from "../api";
import { DefaultEventBus } from "./DefaultEventBus";
import { List } from "immutable";

const TEST_EVENT_TYPE = "test" as const;

class TestEvent implements Event<"test"> {
    public type = TEST_EVENT_TYPE;

    constructor(public readonly data: string) {}
}

describe("Given an event bus", () => {
    let target: DefaultEventBus;
    let idProvider: MockProxy<IdProvider>;

    beforeEach(() => {
        idProvider = mock<IdProvider>();
        target = new DefaultEventBus(idProvider);
    });

    describe("When subscribing to a test event", () => {
        test("Then I get the proper subscription back", () => {
            const id = "1";

            idProvider.generateId.mockReturnValue(id);

            const { cancel, ...rest } = target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    return T.of({
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
                return T.of({
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
                return T.of({
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
                return T.of({
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
                return T.of({
                    subscription: "Keep",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return T.of({
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
                return T.of({
                    subscription: "Cancel",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                calls++;
                return T.of({
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
                return T.of({
                    subscription: "Keep",
                });
            });

            target.subscribe(TEST_EVENT_TYPE, (e) => {
                secondCalls++;
                return T.of({
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
                    return T.of({
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
                return T.of({
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
                return T.of({
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
                    return T.of({
                        subscription: "Keep",
                    });
                },
                DEFAULT_EVENT_SCOPE
            );

            target.subscribe(
                TEST_EVENT_TYPE,
                (e) => {
                    return T.of({
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
