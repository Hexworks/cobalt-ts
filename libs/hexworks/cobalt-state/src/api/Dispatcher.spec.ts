import { ZodValidationError } from "@hexworks/cobalt-core";
import { EventBus } from "@hexworks/cobalt-events";
import { JobState, Scheduler } from "@hexworks/cobalt-scheduler";
import * as T from "fp-ts/Task";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { List } from "immutable";
import { MockProxy, mock, objectContainsValue } from "jest-mock-extended";
import {
    AnyStateWithContext,
    Dispatcher,
    EventWithStateKey,
    UnknownEventError,
    UnknownStateError,
    dispatcher,
} from ".";
import { StateTransitionError } from "./errors/StateTransitionError";
import {
    BumpSent,
    Context,
    EventType,
    FillingForm,
    FormDataRepository,
    FormSubmitted,
    Idle,
    PromptSent,
    Reporting,
    StateType,
    TimedOut,
    User,
    WaitingForInput,
} from "./test";

const TEST_USER: User = {
    id: "test",
};

const JOB_STUB = (correlationId: string) => ({
    correlationId,
    currentFailCount: 0,
    data: {},
    log: [],
    name: "test",
    state: JobState.SCHEDULED,
    type: "Timeout",
    createdAt: new Date(),
    scheduledAt: new Date(),
    updatedAt: new Date(),
});

describe("Given a state machine dispatcher", () => {
    let target: Dispatcher<Context, EventWithStateKey<string>>;
    let context: Context;
    let eventBus: MockProxy<EventBus>;
    let formDataRepository: MockProxy<FormDataRepository>;
    let scheduler: MockProxy<Scheduler>;

    beforeEach(() => {
        eventBus = mock<EventBus>();
        formDataRepository = mock<FormDataRepository>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scheduler = mock<Scheduler>();

        context = {
            eventBus,
            formDataRepository,
            scheduler,
        };
        target = dispatcher(
            List.of<AnyStateWithContext<Context>>(
                Idle,
                FillingForm,
                WaitingForInput,
                Reporting
            )
        );
    });

    describe("When dispatching an invalid state", () => {
        test("Then it fails", async () => {
            const nonExistentState = "hello";
            const key = "saf32qr@#Q$@#";

            const result = await target.dispatch(
                nonExistentState,
                {},
                new BumpSent(key)
            )(context)();

            if (E.isRight(result)) {
                fail("Should have returned an unknown state error.");
            }

            expect(result.left).toBeInstanceOf(UnknownStateError);
            expect(result.left.details?.["stateName"]).toBe(nonExistentState);
        });
    });

    describe("When constructing a state", () => {
        test("Then only exit actions are executed on it when an event is sent", async () => {
            const key = "asdfaw3weasdf";

            scheduler.cancelByCorrelationId.mockReturnValueOnce(TE.right(true));

            scheduler.schedule
                .calledWith(objectContainsValue("Bump"))
                .mockReturnValue(TE.right(JOB_STUB(key)));

            const result = await target.dispatch(
                StateType.Idle,
                {
                    userId: TEST_USER.id,
                    key,
                },
                new PromptSent(key)
            )(context)();

            expect(E.isRight(result)).toBe(true);
            expect(scheduler.schedule).toBeCalledTimes(1);
            expect(scheduler.cancelByCorrelationId).toBeCalledTimes(1);
        });
    });

    describe("When dispatching with an existing state and the right data", () => {
        test("Then it fails if the state doesn't accept the given event", async () => {
            const key = "asdfaw3weasdf";
            const unacceptableEvent = new FormSubmitted(key, "test data");

            const result = await target.dispatch(
                StateType.Idle,
                {
                    userId: TEST_USER.id,
                    key,
                },
                unacceptableEvent
            )(context)();

            if (E.isRight(result)) {
                fail("Should have returned an unknown event error.");
            }

            expect(result.left).toBeInstanceOf(UnknownEventError);
            expect(result.left.details?.["eventType"]).toBe(
                EventType.FormSubmitted
            );
        });

        test("Then it succeeds with the default transition when the condition doesn't hold", async () => {
            const key = "asdf23q3waf";
            const acceptableEvent = new BumpSent(key);

            formDataRepository.save.mockReturnValueOnce(TE.right(undefined));
            eventBus.publish.mockReturnValueOnce(T.of(undefined));

            const result = await target.dispatch(
                StateType.WaitingForInput,
                {
                    userId: TEST_USER.id,
                    key,
                    bumpCount: 6,
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: Reporting,
                    data: {
                        userId: "test",
                        key,
                        bumpCount: 6,
                        data: "no data",
                    },
                })
            );
        });

        test("Then it succeeds with the transition for which the condition holds", async () => {
            const key = "asdfaw3weasdf";
            const acceptableEvent = new BumpSent(key);

            scheduler.schedule.mockReturnValueOnce(TE.right(JOB_STUB(key)));

            const result = await target.dispatch(
                StateType.WaitingForInput,
                {
                    userId: TEST_USER.id,
                    key,
                    bumpCount: 2,
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        key,
                        bumpCount: 3,
                    },
                })
            );
        });

        test("Then it succeeds when the proper event is sent", async () => {
            const key = "lkhio32wwef";
            const acceptableEvent = new TimedOut(key);

            scheduler.cancelByCorrelationId.mockReturnValueOnce(TE.right(true));
            scheduler.schedule.mockReturnValueOnce(TE.right(JOB_STUB(key)));

            const result = await target.dispatch(
                StateType.FillingForm,
                {
                    userId: TEST_USER.id,
                    key,
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        bumpCount: 0,
                        key,
                    },
                })
            );
        });
    });

    describe("When dispatching with an existing state and the wrong data", () => {
        test("Then we get the appropriate error", async () => {
            const key = "fsdg432w44qwas";
            const acceptableEvent = new BumpSent(key);

            const result = await target.dispatch(
                StateType.WaitingForInput,
                {
                    retard: true,
                },
                acceptableEvent
            )(context)();

            if (E.isRight(result)) {
                fail("Expected a schema validation error");
            }

            expect(result.left).toBeInstanceOf(StateTransitionError);
            expect(result.left.cause).toBeInstanceOf(ZodValidationError);
        });
    });
});
