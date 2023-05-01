import { EventType } from "./EventType";

export class FormSubmitted {
    public readonly type = EventType.FormSubmitted;
    constructor(public stateKey: string, public data: string) {}
}
