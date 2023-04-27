import { pipe } from "fp-ts/lib/function";
import * as O from "fp-ts/Option";
import * as RTE from "fp-ts/ReaderTaskEither";
import {
    completeTodo,
    deleteTodo,
    findAllTodos,
    findTodo,
    MissingPermissionError,
    roles,
    Todo,
} from ".";
import { AnyPermission, Authorization, Context } from "..";
import { allow, allowAllPolicy } from "../utils";

const allowForSelfPolicy = (context: Context<Todo>) => {
    const { currentUser: user, data } = context;
    if (user.id === data.owner.id) {
        return RTE.right(context);
    } else {
        return RTE.left(new MissingPermissionError());
    }
};

const filterOnlyPublished = (context: Context<Todo[]>) => {
    const { data } = context;
    return RTE.right({
        ...context,
        data: data.filter((d) => {
            return pipe(
                O.sequenceArray([d.published, O.some(true)]),
                O.map(([a, b]) => a === b),
                O.fold(
                    () => false,
                    (x) => x
                )
            );
        }),
    });
};

const filterCompletedVisibilityForAnon = (context: Context<Todo[]>) => {
    const { data } = context;
    return RTE.right({
        ...context,
        data: data.map((d) => {
            return {
                id: d.id,
                owner: d.owner,
                description: d.description,
                completed: O.none,
                published: d.published,
            };
        }),
    });
};

const allowFindPublishedTodosForAnon = {
    name: "Allow find all todos for anybody",
    operationName: findAllTodos.name,
    policies: [allowAllPolicy()],
    filters: [filterOnlyPublished, filterCompletedVisibilityForAnon],
};

const allowFindPublishedTodosForUser = {
    name: "Allow find all todos for user",
    operationName: findAllTodos.name,
    policies: [allowAllPolicy()],
    filters: [filterOnlyPublished],
};

const allowFindTodosForAdmin = {
    name: "Allow find all todos for user",
    operationName: findAllTodos.name,
    policies: [allowAllPolicy()],
};

const allowCompleteTodoForSelf = {
    name: "Allow complete todo for self",
    operationName: completeTodo.name,
    policies: [allowForSelfPolicy],
};

const allowDeleteTodoForSelf = {
    name: "Allow delete todo for self",
    operationName: deleteTodo.name,
    policies: [allowForSelfPolicy],
};

const anonymousPermissions: AnyPermission[] = [
    allowFindPublishedTodosForAnon,
    allow(findTodo),
];

const userPermissions: AnyPermission[] = [
    allowFindPublishedTodosForUser,
    allow(findTodo),
    allowCompleteTodoForSelf,
    allowDeleteTodoForSelf,
];

const adminPermissions: AnyPermission[] = [
    allowFindTodosForAdmin,
    allow(findTodo),
    allowCompleteTodoForSelf,
    allow(deleteTodo),
];

export const authorization: Authorization = {
    roles: {
        [roles.anonymous]: {
            name: roles.anonymous,
            permissions: anonymousPermissions,
        },
        [roles.user]: {
            name: roles.user,
            permissions: userPermissions,
        },
        [roles.admin]: {
            name: roles.admin,
            permissions: adminPermissions,
        },
    },
};
