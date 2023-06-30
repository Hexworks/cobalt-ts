export type Timer = {
    setTimeout: (callback: () => void, ms: number) => void;
    cancel: () => void;
};

export const Timer = (): Timer => {
    let timeout: NodeJS.Timeout | undefined = undefined;

    const cancel = () => {
        if (timeout) {
            clearTimeout(timeout);
        }
        timeout = undefined;
    };

    // 📕 You might be tempted to just rename this to setTimeout to avoid
    // using the : syntax in the return statement but that would be a mistake.
    // In that case instead of using the ambient setTimeout it would use
    // our own setTimeout which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    // which would lead to a stack overflow.
    const doSetTimeout = (callback: () => void, ms: number) => {
        cancel();
        timeout = setTimeout(() => {
            timeout = undefined;
            callback();
        }, ms);
    };

    return {
        setTimeout: doSetTimeout,
        cancel,
    };
};
