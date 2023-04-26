import { User } from "..";

export class BumpSent {
    public readonly type = "BumpSent";
    constructor(public user: User) {}
}
