/**
 * Represents a component that can be used to generate ids of type T.
 */
export type IdProvider<T> = {
    generateId: () => T;
};
