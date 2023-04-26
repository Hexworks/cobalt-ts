import { User } from "..";

export class TimedOut {
    public readonly type = "TimedOut";
    constructor(public user: User) {}
}
