import * as TE from "fp-ts/lib/TaskEither";
import { pipe } from "fp-ts/lib/function";
import { BaseState, Context } from "..";
import { executeWithContext, state } from "../..";

export type ReportingData = BaseState & { data: string };

export const Reporting = state<ReportingData, Context>("Reporting")
    .onEntry(
        executeWithContext(
            ({ userId, data }, { formDataRepository, eventBus }) =>
                pipe(
                    formDataRepository.save(userId, data),
                    TE.chain(() => {
                        return TE.fromTask(
                            eventBus.publish({
                                type: "FormSubmitted",
                                data: { userId, data },
                            })
                        );
                    })
                )
        )
    )
    .build();
