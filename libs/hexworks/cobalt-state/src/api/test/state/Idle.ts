import { BaseState, FillingForm, WaitingForInput } from ".";
import { Context, EventType, PromptSent, UserInitiatedForm } from "..";
import { executeWithContext, newState, state } from "../..";

export const Idle = state<BaseState, Context>("Idle")
    .withSchema(BaseState)
    .onEntry(
        executeWithContext(({ userId, correlationId }, { scheduler }) => {
            return scheduler.schedule({
                type: "Prompt",
                data: { userId },
                name: `Prompt user ${userId}`,
                scheduledAt: new Date(), // TODO: how do we determine this?
                correlationId,
            });
        })
    )
    .onExit(
        executeWithContext(({ correlationId }, { scheduler }) =>
            scheduler.cancelByCorrelationId(correlationId)
        )
    )
    .onEvent<UserInitiatedForm>(EventType.UserInitiatedForm, (transition) =>
        transition.transitionTo((data) => newState(FillingForm, data))
    )
    .onEvent<PromptSent>(EventType.PromptSent, (transition) =>
        transition.transitionTo((data) =>
            newState(WaitingForInput, {
                ...data,
                bumpCount: 0,
            })
        )
    )
    .build();
