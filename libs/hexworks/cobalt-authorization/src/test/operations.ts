import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import { Operation } from "..";
import { TodoNotFoundError } from "./errors";
import { todos } from "./fixtures";
import { Todo } from "./Todo";

export type NotificationService = {
    notify(message: string): void;
};

export type Deps = {
    notificationService: NotificationService;
};

export const findAllTodos: Operation<void, Array<Todo>> = {
    name: "findAllTodos",
    execute: () => {
        return RTE.right(Object.values(todos));
    },
};

export const findTodo: Operation<number, Todo> = {
    name: "findTodo",
    execute: (id: number) => {
        const todo = todos[id];
        if (todo) {
            return RTE.right(todo);
        } else {
            return RTE.left(new TodoNotFoundError(id));
        }
    },
};

export const completeTodo: Operation<Todo, Todo, Deps> = {
    name: "completeTodo",
    execute: (input: Todo) => {
        input.completed = O.some(true);
        return pipe(
            RTE.ask<Deps>(),
            RTE.chain(({ notificationService }) => {
                notificationService.notify(`Todo ${input.id} completed`);
                return RTE.right(input);
            })
        );
    },
};

export const deleteTodo: Operation<Todo, void, Deps> = {
    name: "deleteTodo",
    execute: (input: Todo) => {
        input.completed = O.some(true);
        return pipe(
            RTE.ask<Deps>(),
            RTE.chain(({ notificationService }) => {
                notificationService.notify(`Todo ${input.id} deleted`);
                return RTE.right(undefined);
            })
        );
    },
};
