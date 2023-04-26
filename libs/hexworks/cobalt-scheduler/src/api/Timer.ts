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

    const setTimeout = (callback: () => void, ms: number) => {
        cancel();
        setTimeout(callback, ms);
    };

    return {
        setTimeout,
        cancel,
    };
};
