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
    StateInstance,
    StateInstanceNotFoundError,
    StateRepository,
} from "..";
import { captor } from "../internal";
import {
    AutoDispatcher,
    ErrorReporter,
    autoDispatch,
    newStateMachine,
} from "./StateMachine";
import { JOB_STUB } from "./StateMachine.spec";
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
    let target: AutoDispatcher<Context>;

    let idProvider: MockProxy<IdProvider<string>>;
    let eventBus: EventBus;

    let scheduler: MockProxy<Scheduler>;
    let errorReporter: MockProxy<ErrorReporter>;
    let formDataRepository: MockProxy<FormDataRepository>;
    let stateRepository: MockProxy<StateRepository>;
    let mapInstance: <D, N extends string>(
        instance: StateInstance<D, Context, N>
    ) => StateEntity<string, D, unknown>;

    beforeEach(() => {
        idProvider = mock<IdProvider<string>>();

        eventBus = EventBus({ idProvider });

        scheduler = mock<Scheduler>();
        errorReporter = mock<ErrorReporter>();
        formDataRepository = mock<FormDataRepository>();
        stateRepository = mock<StateRepository>();
        mapInstance = (instance) => ({
            id: idProvider.generateId(),
            stateName: instance.state.name,
            data: instance.data,
        });

        target = autoDispatch<Context>(
            newStateMachine(
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
            mapInstance,
        });
    });

    test("Then when an event is sent that can be handled it is handled properly", async () => {
        const id = "@#$dsfa234fsadf";
        const entity = {
            id,
            stateName: StateType.Idle,
            data: {
                id,
                userId,
            },
        };
        const job = JOB_STUB({
            correlationId: id,
            type: "Timeout",
            name: `Timeout user ${userId}`,
            data: { userId },
        });
        const newStateCaptor = captor<StateEntity<string, unknown, unknown>>();

        scheduler.cancelByCorrelationId.mockReturnValue(TE.right(true));
        scheduler.schedule.mockReturnValue(TE.right(job));
        stateRepository.findById
            .calledWith(id)
            .mockReturnValue(TE.right(entity));
        stateRepository.upsert
            .calledWith(newStateCaptor)
            .mockReturnValue(TE.right(newStateCaptor.value));
        errorReporter.report.mockReturnValue(T.of(undefined));

        await eventBus.publish(new UserInitiatedForm(id))();

        expect(stateRepository.findById).toHaveBeenCalledWith(id);
        expect(errorReporter.report).toHaveBeenCalledTimes(0);
        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(newStateCaptor.value).toEqual({
            id,
            stateName: StateType.FillingForm,
            data: {
                id,
                userId,
            },
        });
    });

    test("Then when an event is sent that doesn't have a corresponding state no state change occurs", async () => {
        const id = ";lj90afuw9320";

        const expectedError = new StateInstanceNotFoundError(id);
        const expectedEvent = new UserInitiatedForm(id);

        stateRepository.findById
            .calledWith(id)
            .mockReturnValue(TE.left(expectedError));
        errorReporter.report.mockReturnValue(T.of(undefined));

        await eventBus.publish(expectedEvent)();

        expect(stateRepository.findById).toHaveBeenCalledWith(id);
        expect(errorReporter.report).toHaveBeenCalledWith(
            expectedError,
            expectedEvent
        );

        expect(scheduler.schedule).toHaveBeenCalledTimes(0);
        expect(stateRepository.upsert).toHaveBeenCalledTimes(0);
    });

    test("Then after the dispatcher is stopped no event should be handled", async () => {
        target.stop();
        const id = "sadf23rq23fsad";

        await eventBus.publish(new UserInitiatedForm(id))();

        expect(stateRepository.findById).toHaveBeenCalledTimes(0);
        expect(scheduler.schedule).toHaveBeenCalledTimes(0);
        expect(errorReporter.report).toHaveBeenCalledTimes(0);
    });

    test("Then when a new state is created it is saved properly, and entry actions are executed", async () => {
        const id = "@#$dsfa234fsadf";

        const data = {
            id,
            userId,
        };
        const instance = {
            state: Idle,
            data,
        };
        const job = JOB_STUB({
            correlationId: id,
            type: "Prompt",
            name: `Prompt user ${userId}`,
            data: { userId },
        });
        const newStateCaptor = captor<StateEntity<string, unknown, unknown>>();

        idProvider.generateId.mockReturnValue(id);
        scheduler.schedule.mockReturnValue(TE.right(job));
        stateRepository.upsert
            .calledWith(newStateCaptor)
            .mockReturnValue(TE.right(newStateCaptor.value));
        errorReporter.report.mockReturnValue(T.of(undefined));

        await target.create(instance)();

        expect(errorReporter.report).toHaveBeenCalledTimes(0);
        expect(scheduler.schedule).toHaveBeenCalledTimes(1);
        expect(newStateCaptor.value).toEqual({
            id,
            stateName: StateType.Idle,
            data: {
                id,
                userId,
            },
        });
    });
});
