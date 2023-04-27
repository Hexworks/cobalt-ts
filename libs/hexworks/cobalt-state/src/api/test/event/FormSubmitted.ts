import { User } from "../User";
import { EventType } from "./EventType";

export class FormSubmitted {
    public readonly type = EventType.FormSubmitted;
    constructor(public user: User, public data: string) {}
}
