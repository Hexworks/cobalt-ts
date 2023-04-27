import * as O from "fp-ts/Option";
import { Entity, User } from "..";

export interface Todo extends Entity<number, User<number>> {
    id: number;
    owner: User<number>;
    description: O.Option<string>;
    completed: O.Option<boolean>;
    published: O.Option<boolean>;
}
