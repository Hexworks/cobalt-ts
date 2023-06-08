import { BumpSent, Context, EventType, UserInitiatedForm } from "..";
import { WaitingForInputData } from "./schema";
import { State, executeWithContext, newState, state } from "../..";
import { FillingForm } from "./FillingForm";
import { Reporting } from "./Reporting";

export const WaitingForInput: State<
    WaitingForInputData,
    Context,
    "WaitingForInput"
> = state<WaitingForInputData, Context, "WaitingForInput">("WaitingForInput")
    .withSchema(WaitingForInputData)
    .onEntry(
        executeWithContext(({ userId, id }, { scheduler }) =>
            scheduler.schedule({
                type: "Bump",
                data: { userId: userId },
                name: `Bump user ${userId}`,
                scheduledAt: new Date(), // TODO: when?
                correlationId: id,
            })
        )
    )
    .onEvent<BumpSent>(EventType.BumpSent, (transition) =>
        transition
            .withCondition(({ bumpCount }) => bumpCount < 3)
            .doTransition((state) =>
                newState(WaitingForInput, {
                    ...state,
                    bumpCount: state.bumpCount + 1,
                })
            )
            .otherwise((state) =>
                newState(Reporting, {
                    ...state,
                    data: "no data",
                })
            )
    )
    .onEvent<UserInitiatedForm>(EventType.UserInitiatedForm, (transition) =>
        transition.transitionTo((state) => newState(FillingForm, state))
    )
    .build();
