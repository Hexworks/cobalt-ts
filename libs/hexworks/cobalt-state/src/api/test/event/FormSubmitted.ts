import { EventType } from "./EventType";

export class FormSubmitted {
    public readonly type = EventType.FormSubmitted;
    constructor(public id: string, public data: string) {}
}
