import { User } from "..";

export class PromptSent {
    public readonly type = "PromptSent";
    constructor(public user: User) {}
}
