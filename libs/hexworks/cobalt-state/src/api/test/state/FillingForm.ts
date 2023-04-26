import { BaseState, Context, FormSubmitted, TimedOut } from "..";
import { executeWithContext, newState, state } from "../..";
import { Reporting } from "./Reporting";
import { WaitingForInput } from "./WaitingForInput";

export const FillingForm = state<BaseState, Context>("FillingForm")
    .onEntry(
        executeWithContext(({ userId }, { scheduler }) =>
            scheduler.schedule({
                type: "Timeout",
                data: { userId },
                name: `Timeout user ${userId}`,
                scheduledAt: new Date(),
            })
        )
    )
    .onEvent<TimedOut>("TimedOut", (transition) =>
        transition.transitionTo(({ user }) =>
            newState(WaitingForInput, { userId: user.id, bumpCount: 0 })
        )
    )
    .onEvent<FormSubmitted>("FormSubmitted", (transition) =>
        transition.transitionTo(({ user, data }) =>
            newState(Reporting, {
                userId: user.id,
                data,
            })
        )
    )
    .build();
