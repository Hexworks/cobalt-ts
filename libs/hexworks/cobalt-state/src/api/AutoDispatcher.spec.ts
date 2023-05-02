import { IdProvider } from "@hexworks/cobalt-core";
import { EventBus } from "@hexworks/cobalt-events";
import { Scheduler } from "@hexworks/cobalt-scheduler";
import { List } from "immutable";
import { MockProxy, mock } from "jest-mock-extended";
import { v4 as generateId } from "uuid";
import { AnyStateWithContext, StateRepository } from "..";
import {
    AutoDispatcher,
    AutoDispatcherDeps,
    ErrorReporter,
    EventWithStateKey,
    autoDispatch,
    dispatcher,
} from "./Dispatcher";
import {
    Context,
    FillingForm,
    FormDataRepository,
    Idle,
    Reporting,
    WaitingForInput,
} from "./test";

describe("When using the auto-dispatcher", () => {
    let target: AutoDispatcher;
    let idProvider: IdProvider<string>;
    let scheduler: MockProxy<Scheduler>;
    let errorReporter: MockProxy<ErrorReporter>;
    let formDataRepository: MockProxy<FormDataRepository>;
    let stateRepository: MockProxy<StateRepository<string>>;
    let eventBus: EventBus;

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
        EventBus;
    });
});
