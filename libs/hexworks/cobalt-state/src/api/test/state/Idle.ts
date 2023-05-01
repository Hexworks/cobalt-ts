import { Context, EventType, PromptSent, UserInitiatedForm } from "..";
import { executeWithContext, newState, state } from "../..";
import { FillingForm } from "./FillingForm";
import { WaitingForInput } from "./WaitingForInput";
import { BaseState } from "./schema";

export const Idle = state<BaseState, Context>("Idle")
    .withSchema(BaseState)
    .onEntry(
        executeWithContext(({ userId, key }, { scheduler }) => {
            return scheduler.schedule({
                type: "Prompt",
                data: { userId },
                name: `Prompt user ${userId}`,
                scheduledAt: new Date(), // TODO: how do we determine this?
                correlationId: key,
            });
        })
    )
    .onExit(
        executeWithContext(({ key }, { scheduler }) =>
            scheduler.cancelByCorrelationId(key)
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
