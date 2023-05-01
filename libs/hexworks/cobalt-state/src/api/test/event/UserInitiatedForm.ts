import { EventType } from "./EventType";

export class UserInitiatedForm {
    public readonly type = EventType.UserInitiatedForm;
    constructor(public stateKey: string) {}
}
