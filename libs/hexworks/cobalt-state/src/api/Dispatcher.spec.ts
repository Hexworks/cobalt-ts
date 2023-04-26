import { List } from "immutable";
import { AnyStateWithContext, Dispatcher, dispatcher } from ".";
import { Context, FillingForm, Idle, Reporting, WaitingForInput } from "./test";

describe("Given a state machine dispatcher", () => {
    let target: Dispatcher<Context>;

    beforeEach(() => {
        target = dispatcher(
            List.of<AnyStateWithContext<Context>>(
                Idle,
                FillingForm,
                WaitingForInput,
                Reporting
            )
        );
    });

    test("When", async () => {
        target.dispatch(Idle.name, {}, { type: "START" });
    });
});
