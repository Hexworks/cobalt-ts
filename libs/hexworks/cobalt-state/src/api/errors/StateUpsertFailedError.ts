import { ProgramError, ProgramErrorBase } from "@hexworks/cobalt-core";
import { StateEntity } from "../StateRepository";

export class StateUpsertFailedError extends ProgramErrorBase<"StateUpsertFailedError"> {
    constructor(
        cause: ProgramError,
        public stateEntity: StateEntity<unknown, unknown, unknown>
    ) {
        super({
            __tag: "StateUpsertFailedError",
            cause,
            message: `Upserting state instance (${stateEntity.stateName}) with key ${stateEntity.id} failed. Cause: ${cause.message}`,
            details: {
                stateName: stateEntity.stateName,
            },
        });
    }
}
