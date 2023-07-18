import * as O from "fp-ts/Option";
import { ask, chain, left, right } from "fp-ts/ReaderTaskEither";
import { pipe } from "fp-ts/lib/function";
import { OperationDependencies } from "../Operation";
import { Todo } from "./Todo";
import { TodoNotFoundError } from "./errors";
import { todos } from "./fixtures";

export type NotificationService = {
    notify(message: string): void;
};

export type Deps = OperationDependencies & {
    notificationService: NotificationService;
};

export const findAllTodos = {
    name: "findAllTodos",
    execute: () => {
        return right(Object.values(todos));
    },
};

export const findTodo = {
    name: "findTodo",
    execute: (id: number) => {
        const todo = todos[id];
        if (todo) {
            return right(todo);
        } else {
            return left(new TodoNotFoundError(id));
        }
    },
};

export const completeTodo = {
    name: "completeTodo",
    execute: (input: Todo) => {
        input.completed = O.some(true);
        return pipe(
            ask<Deps>(),
            chain(({ notificationService }) => {
                notificationService.notify(`Todo ${input.id} completed`);
                return right(input);
            })
        );
    },
};

export const deleteTodo = {
    name: "deleteTodo",
    execute: (input: Todo) => {
        input.completed = O.some(true);
        return pipe(
            ask<Deps>(),
            chain(({ notificationService }) => {
                notificationService.notify(`Todo ${input.id} deleted`);
                return right(undefined);
            })
        );
    },
};
