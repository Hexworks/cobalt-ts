import { ZodValidationError } from "@hexworks/cobalt-core";
import { EventBus } from "@hexworks/cobalt-events";
import {
    ContextBoundScheduler,
    Job,
    JobState,
} from "@hexworks/cobalt-scheduler";
import * as E from "fp-ts/lib/Either";
import * as TE from "fp-ts/lib/TaskEither";
import { List } from "immutable";
import { MockProxy, mock, objectContainsValue } from "jest-mock-extended";
import { JsonObject } from "type-fest";
import {
    AnyStateWithContext,
    EventWithStateId,
    StateMachine,
    UnknownEventError,
    UnknownStateError,
    newStateMachine,
    state,
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
    TimedOut,
    User,
    WaitingForInput,
    WaitingForInputData,
} from "./test";
import { v4 as uuid } from "uuid";

const TEST_USER_ID = uuid();
const CORRELATION_ID = uuid();
const JOB_ID = uuid();

const TEST_USER: User = {
    id: TEST_USER_ID,
};

export const JOB_STUB = (job: Partial<Job<JsonObject>>): Job<JsonObject> => {
    const {
        id = JOB_ID,
        correlationId = CORRELATION_ID,
        type = `type`,
        currentFailCount = 0,
        data = {},
        log = [],
        name = `name`,
        state = JobState.SCHEDULED,
        previouslyScheduledAt = new Date(),
        createdAt = new Date(),
        scheduledAt = new Date(),
        updatedAt = new Date(),
    } = job;
    return {
        id,
        correlationId,
        type,
        currentFailCount,
        data,
        log,
        name,
        state,
        previouslyScheduledAt,
        createdAt,
        scheduledAt,
        updatedAt,
    };
};

const NonExistentState = state<void, Context>("NonExistentState").build();

describe("Given a state machine StateMachine", () => {
    let target: StateMachine<Context, EventWithStateId<string>>;

    let context: Context;
    let eventBus: MockProxy<EventBus>;
    let formDataRepository: MockProxy<FormDataRepository>;
    let scheduler: MockProxy<ContextBoundScheduler>;

    beforeEach(() => {
        eventBus = mock<EventBus>();
        formDataRepository = mock<FormDataRepository>();
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scheduler = mock<ContextBoundScheduler>();

        context = {
            eventBus,
            formDataRepository,
            scheduler,
        };
        target = newStateMachine(
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
            const key = "saf32qr@#Q$@#";

            const result = await target.dispatch(
                { state: NonExistentState, data: undefined },
                new BumpSent(key)
            )(context)();

            if (E.isRight(result)) {
                fail("Should have returned an unknown state error.");
            }

            expect(result.left).toBeInstanceOf(UnknownStateError);
            expect(result.left.details?.["stateName"]).toBe(
                NonExistentState.name
            );
        });
    });

    describe("When constructing a state", () => {
        test("Then only exit actions are executed on it when an event is sent", async () => {
            const id = "asdfaw3weasdf";

            scheduler.cancelByCorrelationId.mockReturnValueOnce(TE.right(true));

            scheduler.schedule
                .calledWith(objectContainsValue("Bump"))
                .mockReturnValue(TE.right(JOB_STUB({ correlationId: id })));

            const result = await target.dispatch(
                {
                    state: Idle,
                    data: {
                        userId: TEST_USER.id,
                        id,
                    },
                },
                new PromptSent(id)
            )(context)();

            expect(E.isRight(result)).toBe(true);
            expect(scheduler.schedule).toBeCalledTimes(1);
            expect(scheduler.cancelByCorrelationId).toBeCalledTimes(1);
        });
    });

    describe("When dispatching with an existing state and the right data", () => {
        test("Then it fails if the state doesn't accept the given event", async () => {
            const id = "asdfaw3weasdf";
            const unacceptableEvent = new FormSubmitted(id, "test data");

            const result = await target.dispatch(
                {
                    state: Idle,
                    data: {
                        id,
                        userId: TEST_USER.id,
                    },
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
            const id = "asdf23q3waf";
            const acceptableEvent = new BumpSent(id);

            formDataRepository.save.mockReturnValueOnce(TE.right(undefined));
            eventBus.publish.mockReturnValueOnce(TE.right(undefined));

            const result = await target.dispatch(
                {
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        id,
                        bumpCount: 6,
                    },
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: Reporting,
                    data: {
                        userId: TEST_USER_ID,
                        id,
                        bumpCount: 6,
                        data: "no data",
                    },
                })
            );
        });

        test("Then it succeeds with the transition for which the condition holds", async () => {
            const id = "asdfaw3weasdf";
            const acceptableEvent = new BumpSent(id);

            scheduler.schedule.mockReturnValueOnce(
                TE.right(JOB_STUB({ correlationId: id }))
            );

            const result = await target.dispatch(
                {
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        id,
                        bumpCount: 2,
                    },
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        id,
                        bumpCount: 3,
                    },
                })
            );
        });

        test("Then it succeeds when the proper event is sent", async () => {
            const id = "lkhio32wwef";
            const acceptableEvent = new TimedOut(id);

            scheduler.cancelByCorrelationId.mockReturnValueOnce(TE.right(true));
            scheduler.schedule.mockReturnValueOnce(
                TE.right(JOB_STUB({ correlationId: id }))
            );

            const result = await target.dispatch(
                {
                    state: FillingForm,
                    data: {
                        userId: TEST_USER.id,
                        id,
                    },
                },
                acceptableEvent
            )(context)();

            expect(result).toEqual(
                E.right({
                    state: WaitingForInput,
                    data: {
                        userId: TEST_USER.id,
                        bumpCount: 0,
                        id,
                    },
                })
            );
        });
    });

    describe("When dispatching with an existing state and the wrong data", () => {
        test("Then we get the appropriate error", async () => {
            const id = "fsdg432w44qwas";
            const acceptableEvent = new BumpSent(id);

            const result = await target.dispatch(
                {
                    state: WaitingForInput,
                    data: {
                        retard: true,
                    } as unknown as WaitingForInputData,
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
