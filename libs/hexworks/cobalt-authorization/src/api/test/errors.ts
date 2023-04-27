import { ProgramErrorBase } from "@hexworks/cobalt-core";

export class TodoNotFoundError extends ProgramErrorBase<"TodoNotFoundError"> {
    constructor(id: number) {
        super({
            __tag: "TodoNotFoundError",
            message: `Todo with id ${id} not found`,
        });
    }
}

export class MissingPermissionError extends ProgramErrorBase<"MissingPermissionError"> {
    constructor() {
        super({
            __tag: "MissingPermissionError",
            message: `"The current user can't perform this operation."`,
        });
    }
}
