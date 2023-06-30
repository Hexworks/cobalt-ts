import { Timer } from "./Timer";

describe("Given a Timer", () => {
    describe("When setTimeout is called", () => {
        test("Then it doesn't do a stack overflow", () => {
            const timer = Timer();
            let finished = false;
            timer.setTimeout(() => {
                finished = true;
            }, 10);

            setTimeout(() => {
                expect(finished).toBe(true);
            }, 100);
        });

        test("Twice then the callback is executed twice", () => {
            const timer = Timer();
            let calls = 0;

            const callback = () => {
                calls++;
            };

            timer.setTimeout(() => {
                callback();
                timer.setTimeout(callback, 10);
            }, 10);

            setTimeout(() => {
                expect(calls).toBe(2);
            }, 100);
        });
    });
});
