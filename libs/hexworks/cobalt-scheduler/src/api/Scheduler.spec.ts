import {
    IdProvider,
    ProgramError,
    UnknownError,
    sleep,
} from "@hexworks/cobalt-core";
import * as E from "fp-ts/Either";
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { List } from "immutable";
import { MockProxy, any, mock } from "jest-mock-extended";
import { Duration } from "luxon";
import * as z from "zod";
import {
    AnyJobHandler,
    Job,
    JobDescriptor,
    JobExecutionError,
    JobExecutionResult,
    JobRepository,
    JobResult,
    JobState,
    OnErrorStrategy,
    OnResultStrategy,
    Scheduler,
    SchedulerNotRunningError,
    SchedulerStartupError,
    Success,
    Timer,
    createJobHandler,
} from ".";

const jobCheckInterval = Duration.fromMillis(10);

const NumbersToAdd = z.object({
    first: z.number(),
    second: z.number(),
});

type NumbersToAdd = z.infer<typeof NumbersToAdd>;

let NUMBER_ADDER_EXECUTION_RESULTS: JobExecutionResult<
    NumbersToAdd,
    JobResult
>[] = [];

let NUMBER_ADDER_EXECUTION_ERRORS: JobExecutionError<NumbersToAdd>[] = [];

const REPORT_RESULT_STRATEGY: OnResultStrategy<NumbersToAdd, JobResult> = {
    canHandle: function (result: JobResult): result is JobResult {
        return true;
    },
    onResult: function (
        context: JobExecutionResult<
            { first: number; second: number },
            JobResult
        >
    ): TE.TaskEither<ProgramError, void> {
        NUMBER_ADDER_EXECUTION_RESULTS.push(context);
        return TE.right(undefined);
    },
};

const REPORT_ERROR_STRATEGY: OnErrorStrategy<NumbersToAdd, ProgramError> = {
    canHandle: (error: ProgramError): error is ProgramError => true,
    onError: (error: JobExecutionError<NumbersToAdd>) => {
        NUMBER_ADDER_EXECUTION_ERRORS.push(error);
        return TE.right(undefined);
    },
};

const NumberAdderError = new UnknownError("Addding numbers failed");

const NumberAdder = (shouldThrow: boolean) =>
    createJobHandler({
        inputSchema: NumbersToAdd,
        type: "NumberAdder",
        execute: (context) => {
            if (shouldThrow) {
                return TE.left(NumberAdderError);
            }
            const { first, second } = context.data;
            return TE.right(Success(first + second));
        },
        resultStrategies: [REPORT_RESULT_STRATEGY],
        errorStrategies: [REPORT_ERROR_STRATEGY],
    });

const ADD_1_AND_2_JOB: JobDescriptor<NumbersToAdd> = {
    name: "Add Numbers 1 and 2",
    data: {
        first: 1,
        second: 2,
    },
    scheduledAt: new Date(),
    type: "NumberAdder",
};

const CORRELATION_ID = "1";

const UNSAVED_ADD_1_AND_2_JOB = {
    ...ADD_1_AND_2_JOB,
    correlationId: CORRELATION_ID,
    state: JobState.SCHEDULED,
    currentFailCount: 0,
};

const ADD_1_AND_2_CREATION_DATE = new Date();

const SAVED_ADD_1_AND_2_JOB: Job<NumbersToAdd> = {
    ...UNSAVED_ADD_1_AND_2_JOB,
    createdAt: ADD_1_AND_2_CREATION_DATE,
    updatedAt: ADD_1_AND_2_CREATION_DATE,
    log: [],
};

const LATER = new Date(Date.now() + 1000 * 60 * 60);

const SAVED_ADD_1_AND_2_JOB_FOR_LATER = {
    ...SAVED_ADD_1_AND_2_JOB,
    scheduledAt: LATER,
};

describe("Given a Scheduler", () => {
    let jobRepository: MockProxy<JobRepository>;
    let handlers: Map<string, AnyJobHandler>;
    let timer: MockProxy<Timer>;
    let idProvider: MockProxy<IdProvider<string>>;
    let target: Scheduler;

    beforeEach(() => {
        NUMBER_ADDER_EXECUTION_RESULTS = [];
        NUMBER_ADDER_EXECUTION_ERRORS = [];

        jobRepository = mock<JobRepository>();
        timer = mock<Timer>();
        idProvider = mock<IdProvider<string>>();

        handlers = new Map();
        handlers.set("NumberAdder", NumberAdder(false));
        target = Scheduler({
            jobRepository,
            handlers,
            timer,
            jobCheckInterval,
            idProvider,
        });
    });

    describe("When it is started", () => {
        test("Then it should check for jobs according to the config", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));

            await target.start()();

            expect(jobRepository.findNextJobs).toHaveBeenCalled();
        });

        test("Then it should reschedule after jobs are executed", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));

            await target.start()();

            expect(timer.setTimeout).toHaveBeenCalled();
        });

        test("Then it should reschedule even if there was an error", async () => {
            await target.start()();

            expect(timer.setTimeout).toHaveBeenCalled();
        });

        test("Then it fails if it was already stopped", async () => {
            await target.stop()();
            const result = await target.start()();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerStartupError);
            }
        });

        test("Then it fails if it was already running", async () => {
            await target.start()();
            const result = await target.start()();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerStartupError);
            }
        });

        test("Then it should reschedule after running all the jobs", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));

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

    describe("When a job is scheduled", () => {
        test("Then it should fail if the scheduler was not running", async () => {
            const result = await target.schedule(ADD_1_AND_2_JOB)();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerNotRunningError);
            }
        });

        test("Then it should successfully schedule if the scheduler was running", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));
            idProvider.generateId.mockReturnValue(CORRELATION_ID);
            jobRepository.upsert
                .calledWith(any())
                .mockReturnValue(TE.right(SAVED_ADD_1_AND_2_JOB));

            await target.start()();

            const result = await target.schedule(ADD_1_AND_2_JOB)();

            if (E.isRight(result)) {
                expect(result.right).toEqual(SAVED_ADD_1_AND_2_JOB);
            } else {
                fail("Expected success.");
            }
        });

        test("Then it should not be run if scheduled for the future", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.upsert
                .calledWith(any())
                .mockReturnValue(TE.right(SAVED_ADD_1_AND_2_JOB_FOR_LATER));

            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));

            await target.start()();

            expect(NUMBER_ADDER_EXECUTION_RESULTS.length).toBe(0);
        });

        test("Then it should be run if scheduled for now", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.upsert
                .calledWith(any())
                .mockReturnValue(TE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                T.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()();

            expect(NUMBER_ADDER_EXECUTION_RESULTS.length).toBe(1);
        });

        test("Then it should return the proper result", async () => {
            handlers.set("NumberAdder", NumberAdder(false));

            jobRepository.upsert
                .calledWith(any())
                .mockReturnValue(TE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                T.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()();

            expect(NUMBER_ADDER_EXECUTION_RESULTS[0]?.result).toStrictEqual(
                Success(3)
            );
        });

        test("Then it should return the proper error when it fails", async () => {
            handlers.set("NumberAdder", NumberAdder(true));

            jobRepository.upsert
                .calledWith(any())
                .mockReturnValue(TE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                T.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()();

            expect(NUMBER_ADDER_EXECUTION_ERRORS.length).toBe(1);
        });

        test("Then it fails when there is no handler for the scheduled job", async () => {
            jobRepository.findNextJobs.mockReturnValue(T.of(List.of()));

            await target.start()();

            const result = await target.schedule({
                data: {},
                name: "My Test Job",
                scheduledAt: new Date(),
                type: "test",
            })();

            expect(E.isLeft(result)).toBe(true);
        });
    });
});
