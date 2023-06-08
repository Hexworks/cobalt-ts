import { EventType } from "./EventType";

export class BumpSent {
    public readonly type = EventType.BumpSent;
    constructor(public id: string) {}
}
