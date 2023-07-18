import { ProgramError } from "@hexworks/cobalt-core";
import { EventBus } from "@hexworks/cobalt-events";
import { ContextBoundScheduler } from "@hexworks/cobalt-scheduler";
import * as TE from "fp-ts/lib/TaskEither";

export type FormDataRepository = {
    save: (userId: string, data: string) => TE.TaskEither<ProgramError, void>;
};

export type Context = {
    scheduler: ContextBoundScheduler;
    eventBus: EventBus;
    formDataRepository: FormDataRepository;
};
