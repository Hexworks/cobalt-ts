import { EventType } from "./EventType";

export class PromptSent {
    public readonly type = EventType.PromptSent;
    constructor(public id: string) {}
}
