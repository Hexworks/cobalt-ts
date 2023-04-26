import { FillingForm, WaitingForInput } from ".";
import { BaseState, Context, PromptSent, UserInitiatedForm } from "..";
import { executeWithContext, newState, state } from "../..";

export const Idle = state<BaseState, Context>("Idle")
    .onEntry(
        executeWithContext(({ userId }, { scheduler }) =>
            scheduler.schedule({
                type: "Prompt",
                data: { userId: userId },
                name: `Prompt user ${userId}`,
                scheduledAt: new Date(), // TODO: when?
            })
        )
    )
    .onEvent<UserInitiatedForm>("UserInitiatedForm", (transition) =>
        transition.transitionTo(({ user }) =>
            newState(FillingForm, { userId: user.id })
        )
    )
    .onEvent<PromptSent>("PromptSent", (transition) =>
        transition.transitionTo(({ user }) =>
            newState(WaitingForInput, { userId: user.id, bumpCount: 0 })
        )
    )
    .build();
