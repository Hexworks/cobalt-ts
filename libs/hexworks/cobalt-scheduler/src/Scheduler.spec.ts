import { sleep } from "@hexworks/cobalt-core";
import * as T from "fp-ts/Task";
import { TaskEither } from "fp-ts/lib/TaskEither";
import { Map } from "immutable";
import { MockProxy, mock } from "jest-mock-extended";
import { Duration } from "luxon";
import * as z from "zod";
import {
    AnyJobHandler,
    JobContext,
    JobContextWithResult,
    JobExecutionError,
    JobHandlerBase,
    JobRepository,
    JobResult,
    Scheduler,
    Timer,
} from ".";

const jobCheckInterval = Duration.fromMillis(10);

const NumbersToAdd = z.object({
    first: z.number(),
    second: z.number(),
});

type NumbersToAdd = z.infer<typeof NumbersToAdd>;

class NumberAdder extends JobHandlerBase<NumbersToAdd> {
    public type = "test";
    execute(
        context: JobContext<NumbersToAdd>
    ): TaskEither<
        JobExecutionError<NumbersToAdd>,
        JobContextWithResult<NumbersToAdd, JobResult>
    > {
        throw new Error("Method not implemented.");
    }
}

describe("Given a Scheduler", () => {
    let jobRepository: MockProxy<JobRepository>;
    let handlers: Map<string, AnyJobHandler>;
    let timer: MockProxy<Timer>;
    let generateId: MockProxy<() => string>;
    let target: Scheduler;

    beforeEach(() => {
        jobRepository = mock<JobRepository>();
        timer = mock<Timer>();
        generateId = mock<() => string>();
        handlers = Map();
        target = Scheduler({
            jobRepository,
            handlers,
            timer,
            jobCheckInterval,
            generateId,
        });
    });

    describe("When it is started", () => {
        test("Then it should check for jobs according to the config", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of([]));

            await target.start()();

            expect(jobRepository.findNextJobs).toHaveBeenCalled();
        });

        test("Then it should reschedule after running all the jobs", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of([]));
            const handler = new NumberAdder({
                inputSchema: NumbersToAdd,
            });
            handlers.set("test", handler);

            target.schedule({
                name: "My Test Job",
                scheduledAt: new Date(),
                type: "test",
                data: {},
            });

            await target.start()();

            await sleep(100)();
        });
    });

    test("When it is not started, Then it should not check for jobs according to the config", async () => {
        jobRepository.findNextJobs.mockReturnValue(T.of([]));

        await sleep(50)();

        expect(jobRepository.findNextJobs).toBeCalledTimes(0);
    });
});
