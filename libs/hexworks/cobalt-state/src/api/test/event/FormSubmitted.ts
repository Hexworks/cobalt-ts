import { User } from "../User";

export class FormSubmitted {
    public readonly type = "FormSubmitted";
    constructor(public user: User, public data: string) {}
}
