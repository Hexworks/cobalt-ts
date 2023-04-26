import { ProgramError } from "@hexworks/cobalt-data";
import { EventBus } from "@hexworks/cobalt-events";
import { Scheduler } from "@hexworks/cobalt-scheduler";
import * as TE from "fp-ts/lib/TaskEither";

export type FormDataRepository = {
    save: (userId: string, data: string) => TE.TaskEither<ProgramError, void>;
};

export type Context = {
    scheduler: Scheduler;
    eventBus: EventBus;
    formDataRepository: FormDataRepository;
};
