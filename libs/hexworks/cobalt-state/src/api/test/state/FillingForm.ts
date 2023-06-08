import { Reporting, WaitingForInput } from ".";
import { Context, EventType, FormSubmitted, TimedOut } from "..";
import { executeWithContext, newState, state } from "../..";
import { StateType } from "./StateType";
import { BaseState } from "./schema";

export const FillingForm = state<BaseState, Context>(StateType.FillingForm)
    .withSchema(BaseState)
    .onEntry(
        executeWithContext(({ userId, id }, { scheduler }) => {
            return scheduler.schedule({
                type: "Timeout",
                data: { userId },
                name: `Timeout user ${userId}`,
                scheduledAt: new Date(),
                correlationId: id,
            });
        })
    )
    .onExit(
        executeWithContext(({ id }, { scheduler }) =>
            scheduler.cancelByCorrelationId(id)
        )
    )
    .onEvent<TimedOut>(EventType.TimedOut, (transition) =>
        transition.transitionTo((state) =>
            newState(WaitingForInput, {
                ...state,
                bumpCount: 0,
            })
        )
    )
    .onEvent<FormSubmitted>(EventType.FormSubmitted, (transition) =>
        transition.transitionTo((state, { data }) =>
            newState(Reporting, {
                ...state,
                data,
            })
        )
    )
    .build();
