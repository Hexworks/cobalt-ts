import { BaseState, BumpSent, Context, UserInitiatedForm } from "..";
import { State, executeWithContext, newState, state } from "../..";
import { FillingForm } from "./FillingForm";
import { Reporting } from "./Reporting";

type WaitingForInputData = BaseState & { bumpCount: number };

export const WaitingForInput: State<
    WaitingForInputData,
    Context,
    "WaitingForInput"
> = state<WaitingForInputData, Context, "WaitingForInput">("WaitingForInput")
    .onEntry(
        executeWithContext(({ userId }, { scheduler }) =>
            scheduler.schedule({
                type: "Bump",
                data: { userId: userId },
                name: `Bump user ${userId}`,
                scheduledAt: new Date(), // TODO: when?
            })
        )
    )
    .onEvent<BumpSent>("BumpSent", (transition) =>
        transition
            .withCondition((_, { bumpCount }) => bumpCount < 3)
            .doTransition(({ user }, { bumpCount }) =>
                newState(WaitingForInput, {
                    userId: user.id,
                    bumpCount: bumpCount + 1,
                })
            )
            .otherwise(({ user }) =>
                newState(Reporting, {
                    userId: user.id,
                    data: "no data",
                })
            )
    )
    .onEvent<UserInitiatedForm>("UserInitiatedForm", (transition) =>
        transition.transitionTo(({ user }) =>
            newState(FillingForm, { userId: user.id })
        )
    )
    .build();
