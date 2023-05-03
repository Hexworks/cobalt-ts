import { Matcher } from "jest-mock-extended";

export class FixedCaptorMatcher<T> extends Matcher<T> {
    public readonly value!: T;
    public readonly values: T[] = [];

    constructor() {
        super((actualValue: T) => {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            this.value = actualValue;
            this.values.push(actualValue);
            return true;
        }, "captor");
    }

    override getExpectedType() {
        return "Object";
    }
}

export const captor = <T = unknown>() => new FixedCaptorMatcher<T>();
