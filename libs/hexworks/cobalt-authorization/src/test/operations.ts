import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import { ask, chain, left, right } from "fp-ts/ReaderTaskEither";
import { OperationDependencies } from "../Operation";
import { TodoNotFoundError } from "./errors";
import { todos } from "./fixtures";
import { Todo } from "./Todo";

export type NotificationService = {
    notify(message: string): void;
};

export type Deps = OperationDependencies & {
    notificationService: NotificationService;
};

export const findAllTodos = () => {
    return right(Object.values(todos));
};

export const findTodo = (id: number) => {
    const todo = todos[id];
    if (todo) {
        return right(todo);
    } else {
        return left(new TodoNotFoundError(id));
    }
};

export const completeTodo = (input: Todo) => {
    input.completed = O.some(true);
    return pipe(
        ask<Deps>(),
        chain(({ notificationService }) => {
            notificationService.notify(`Todo ${input.id} completed`);
            return right(input);
        })
    );
};
export const deleteTodo = (input: Todo) => {
    input.completed = O.some(true);
    return pipe(
        ask<Deps>(),
        chain(({ notificationService }) => {
            notificationService.notify(`Todo ${input.id} deleted`);
            return right(undefined);
        })
    );
};
