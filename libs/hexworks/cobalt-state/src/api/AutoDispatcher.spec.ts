/* eslint-disable @typescript-eslint/no-unused-vars */
import { IdProvider } from "@hexworks/cobalt-core";
import { EventBus } from "@hexworks/cobalt-events";
import { Scheduler } from "@hexworks/cobalt-scheduler";
import * as TE from "fp-ts/TaskEither";
import * as T from "fp-ts/lib/Task";
import { List } from "immutable";
import { MockProxy, mock } from "jest-mock-extended";
import { v4 as generateId } from "uuid";
import {
    AnyStateWithContext,
    StateEntity,
    StateInstanceNotFoundError,
    StateRepository,
} from "..";
import { captor } from "../internal";
import {
    AutoDispatcher,
    ErrorReporter,
    EventWithStateKey,
    autoDispatch,
    dispatcher,
} from "./Dispatcher";
import { JOB_STUB } from "./Dispatcher.spec";
import {
    Context,
    FillingForm,
    FormDataRepository,
    Idle,
    Reporting,
    StateType,
    UserInitiatedForm,
    WaitingForInput,
} from "./test";

const userId = generateId();

describe("When using the auto-dispatcher", () => {
    let target: AutoDispatcher;

    let idProvider: IdProvider<string>;
    let eventBus: EventBus;

    let scheduler: MockProxy<Scheduler>;
    let errorReporter: MockProxy<ErrorReporter>;
    let formDataRepository: MockProxy<FormDataRepository>;
    let stateRepository: MockProxy<StateRepository<string>>;

    beforeEach(() => {
        idProvider = {
            generateId,
        };
        eventBus = EventBus({ idProvider });

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        scheduler = mock<Scheduler>();
        errorReporter = mock<ErrorReporter>();
        formDataRepository = mock<FormDataRepository>();
        stateRepository = mock<StateRepository<string>>();

        target = autoDispatch<Context, EventWithStateKey<string>>(
            dispatcher(
                List.of<AnyStateWithContext<Context>>(
                    Idle,
                    FillingForm,
                    WaitingForInput,
                    Reporting
                )
            )
        )({
            eventBus,
            scheduler,
            errorReporter,
            formDataRepository,
            stateRepository,
        });
    });

    test("Then when an event is sent that can be handled it is handled properly", async () => {
        const key = "key";
        const entity = {
            key,
            stateName: StateType.Idle,
            data: {
                key,
                userId,
            },
        };
        const job = JOB_STUB({
            correlationId: key,
            type: "Timeout",
            name: `Timeout user ${userId}`,
            data: { userId },
        });
        const newStateCaptor = captor<StateEntity<string, unknown>>();

        scheduler.cancelByCorrelationId.mockReturnValue(TE.right(true));
        scheduler.schedule.mockReturnValue(TE.right(job));
        stateRepository.findByKey
            .calledWith(key)
            .mockReturnValue(TE.right(entity));
        stateRepository.upsert
            .calledWith(newStateCaptor)
            .mockReturnValue(TE.right(newStateCaptor.value));
        errorReporter.report.mockReturnValue(T.of(undefined));

        await eventBus.publish(new UserInitiatedForm(key))();

        expect(stateRepository.findByKey).toHaveBeenCalledWith(key);
        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(errorReporter.report).toHaveBeenCalledTimes(0);
        expect(newStateCaptor.value).toEqual({
            key,
            stateName: StateType.FillingForm,
            data: {
                key,
                userId,
            },
        });
    });

    test("Then when an event is sent that doesn't have a corresponding state no state change occurs", async () => {
        const key = "key";

        const expectedError = new StateInstanceNotFoundError(key);
        const expectedEvent = new UserInitiatedForm(key);

        stateRepository.findByKey
            .calledWith(key)
            .mockReturnValue(TE.left(expectedError));
        errorReporter.report.mockReturnValue(T.of(undefined));

        await eventBus.publish(expectedEvent)();

        expect(stateRepository.findByKey).toHaveBeenCalledWith(key);
        expect(errorReporter.report).toHaveBeenCalledWith(
            expectedError,
            expectedEvent
        );

        expect(scheduler.schedule).toHaveBeenCalledTimes(0);
        expect(stateRepository.upsert).toHaveBeenCalledTimes(0);
    });

    test("Then after the dispatcher is stopped no event should be handled", async () => {
        target.stop();
        const key = "key";

        await eventBus.publish(new UserInitiatedForm(key))();

        expect(stateRepository.findByKey).toHaveBeenCalledTimes(0);
        expect(scheduler.schedule).toHaveBeenCalledTimes(0);
        expect(errorReporter.report).toHaveBeenCalledTimes(0);
    });
});
