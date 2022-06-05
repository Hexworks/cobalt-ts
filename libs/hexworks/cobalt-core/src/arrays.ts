/**
 * Tells whether the two arrays have the same elements (not necessarily in the same order).
 */
export const hasSameElements = <T>(arr0: T[], arr1: T[]): boolean => {
    if (arr0.length !== arr1.length) return false;
    arr0.sort();
    arr1.sort();
    return arr0.join() === arr1.join();
};
