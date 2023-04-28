import { User } from "..";
import { EventType } from "./EventType";

export class TimedOut {
    public readonly type = EventType.TimedOut;
    constructor(public user: User) {}
}