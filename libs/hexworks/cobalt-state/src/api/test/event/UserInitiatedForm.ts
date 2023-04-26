import { User } from "..";

export class UserInitiatedForm {
    public readonly type = "UserInitiatedForm";
    constructor(public user: User) {}
}
