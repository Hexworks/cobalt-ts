import {
    IdProvider,
    ProgramError,
    UnknownError,
    fail,
    sleep,
} from "@hexworks/cobalt-core";
import * as E from "fp-ts/Either";
import * as RT from "fp-ts/ReaderTask";
import * as RTE from "fp-ts/ReaderTaskEither";
import * as TE from "fp-ts/TaskEither";
import { List } from "immutable";
import { MockProxy, any, mock } from "jest-mock-extended";
import { DateTime, Duration } from "luxon";
import { v4 as uuid } from "uuid";
import * as z from "zod";
import {
    AnyJobHandler,
    DEFAULT_RETRY_INTERVAL,
    Job,
    JobDescriptor,
    JobExecutionError,
    JobExecutionResult,
    JobRepository,
    JobState,
    OnErrorStrategy,
    OnResultStrategy,
    RetryFailedError,
    Scheduler,
    SchedulerNotRunningError,
    SchedulerStartupError,
    Timer,
    createJobHandler,
} from "../api";

const jobCheckIntervalMs = 10;

const jobCheckInterval10Ms = Duration.fromMillis(jobCheckIntervalMs);

const NumbersToAdd = z.object({
    first: z.number(),
    second: z.number(),
});

type NumbersToAdd = z.infer<typeof NumbersToAdd>;

let NUMBER_ADDER_EXECUTION_RESULTS: JobExecutionResult<NumbersToAdd, number>[] =
    [];

let NUMBER_ADDER_EXECUTION_ERRORS: JobExecutionError<
    NumbersToAdd,
    UnknownError
>[] = [];

const REPORT_RESULT_STRATEGY: OnResultStrategy<NumbersToAdd, number> = {
    canHandle: () => true,
    onResult: function (
        context: JobExecutionResult<{ first: number; second: number }, number>
    ): TE.TaskEither<ProgramError, void> {
        NUMBER_ADDER_EXECUTION_RESULTS.push(context);
        return TE.right(undefined);
    },
};

const REPORT_ERROR_STRATEGY: OnErrorStrategy<NumbersToAdd, UnknownError> = {
    canHandle: (error: ProgramError): error is UnknownError => true,
    onError: (error: JobExecutionError<NumbersToAdd, UnknownError>) => {
        NUMBER_ADDER_EXECUTION_ERRORS.push(error);
        return TE.right(undefined);
    },
};

const NumberAdderError = new UnknownError("Adding numbers failed");

const NumberAdder = (shouldThrow: boolean) =>
    createJobHandler({
        inputSchema: NumbersToAdd,
        type: "NumberAdder",
        execute: (context) => {
            if (shouldThrow) {
                return TE.left(NumberAdderError);
            }
            const { first, second } = context.job.data;
            return TE.right(first + second);
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
    id: uuid(),
    createdAt: ADD_1_AND_2_CREATION_DATE,
    updatedAt: ADD_1_AND_2_CREATION_DATE,
    log: [],
};

const FAILED_ADD_1_AND_2_JOB: Job<NumbersToAdd> = {
    ...UNSAVED_ADD_1_AND_2_JOB,
    state: JobState.FAILED,
    id: uuid(),
    createdAt: ADD_1_AND_2_CREATION_DATE,
    updatedAt: ADD_1_AND_2_CREATION_DATE,
    log: [],
};

const PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB: Job<NumbersToAdd> = {
    ...UNSAVED_ADD_1_AND_2_JOB,
    state: JobState.FAILED,
    id: uuid(),
    previouslyScheduledAt: ADD_1_AND_2_CREATION_DATE,
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
    let jobRepository: MockProxy<JobRepository<undefined>>;
    let handlers: Map<string, AnyJobHandler>;
    let timer: MockProxy<Timer>;
    let idProvider: MockProxy<IdProvider<string>>;
    let target: Scheduler<undefined>;

    beforeEach(() => {
        NUMBER_ADDER_EXECUTION_RESULTS = [];
        NUMBER_ADDER_EXECUTION_ERRORS = [];

        jobRepository = mock<JobRepository<undefined>>();
        timer = mock<Timer>();
        idProvider = mock<IdProvider<string>>();

        handlers = new Map();
        handlers.set("NumberAdder", NumberAdder(false));
        target = Scheduler({
            jobRepository,
            handlers,
            timer,
            idProvider,
            jobCheckInterval: jobCheckInterval10Ms,
        });
    });

    describe("When it is started with a real timer", () => {
        let currId = 1;

        beforeEach(() => {
            target = Scheduler({
                jobRepository,
                handlers,
                timer: Timer(),
                idProvider: {
                    generateId: () => `${currId++}`,
                },
                jobCheckInterval: jobCheckInterval10Ms,
            });
        });

        test("Then it should start properly", async () => {
            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );
            jobRepository.update.mockReturnValue(
                RTE.right(SAVED_ADD_1_AND_2_JOB)
            );

            const result = await target.start()(undefined)();

            expect(result).toEqual(E.right(undefined));
        });

        test("Then it should run the specified jobs periodically", async () => {
            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );
            jobRepository.update.mockReturnValue(
                RTE.right(SAVED_ADD_1_AND_2_JOB)
            );

            await target.start()(undefined)();

            await sleep(jobCheckIntervalMs * 2)();

            expect(NUMBER_ADDER_EXECUTION_RESULTS.length).toBeGreaterThan(1);
        });
    });

    describe("When it is started with a mocked timer", () => {
        test("Then the job check interval is right", () => {
            expect(
                Duration.fromObject({
                    seconds: 5,
                }).as("milliseconds")
            ).toBe(5000);
        });

        test("Then it should check for jobs according to the config", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();

            expect(jobRepository.findNextJobs).toHaveBeenCalled();
        });

        test("Then it should reschedule after jobs are executed", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();

            expect(timer.setTimeout).toHaveBeenCalled();
        });

        test("Then it should reschedule even if there was an error", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();

            expect(timer.setTimeout).toHaveBeenCalled();
        });

        test("Then it fails if it was already stopped", async () => {
            await target.stop()(undefined)();
            const result = await target.start()(undefined)();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerStartupError);
            }
        });

        test("Then it fails if it was already running", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();
            const result = await target.start()(undefined)();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerStartupError);
            }
        });

        test("Then it should reschedule after running all the jobs", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            target.schedule({
                name: "My Test Job",
                scheduledAt: new Date(),
                type: "test",
                data: {},
            });

            await target.start()(undefined)();

            await sleep(100)();
        });
    });

    describe("When a job is scheduled", () => {
        test("Then it should fail if the scheduler was not running", async () => {
            const result = await target.schedule(ADD_1_AND_2_JOB)(undefined)();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(SchedulerNotRunningError);
            }
        });

        test("Then it should successfully schedule if the scheduler was running", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));
            idProvider.generateId.mockReturnValue(CORRELATION_ID);
            jobRepository.create.mockReturnValue(
                RTE.right(SAVED_ADD_1_AND_2_JOB)
            );

            await target.start()(undefined)();

            const result = await target.schedule(ADD_1_AND_2_JOB)(undefined)();

            if (E.isRight(result)) {
                expect(result.right).toEqual(SAVED_ADD_1_AND_2_JOB);
            } else {
                fail("Expected success.");
            }
        });

        test("Then it should successfully execute a scheduled job when there is a handler", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));
            idProvider.generateId.mockReturnValue(CORRELATION_ID);

            await target.start()(undefined)();

            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );
            jobRepository.create.mockReturnValue(
                RTE.right(SAVED_ADD_1_AND_2_JOB)
            );

            await target.schedule(ADD_1_AND_2_JOB)(undefined)();

            await sleep(100)();
        });

        test("Then it should not be run if scheduled for the future", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.update
                .calledWith(any())
                .mockReturnValue(RTE.right(SAVED_ADD_1_AND_2_JOB_FOR_LATER));

            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();

            expect(NUMBER_ADDER_EXECUTION_RESULTS.length).toBe(0);
        });

        test("Then it should be run if scheduled for now", async () => {
            handlers.set("NumberAdder", NumberAdder(false));
            jobRepository.update
                .calledWith(any())
                .mockReturnValue(RTE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()(undefined)();

            expect(NUMBER_ADDER_EXECUTION_RESULTS.length).toBe(1);
        });

        test("Then it should return the proper result", async () => {
            handlers.set("NumberAdder", NumberAdder(false));

            jobRepository.update
                .calledWith(any())
                .mockReturnValue(RTE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()(undefined)();

            expect(NUMBER_ADDER_EXECUTION_RESULTS[0]?.result).toStrictEqual(3);
        });

        test("Then it should return the proper error when it fails", async () => {
            handlers.set("NumberAdder", NumberAdder(true));

            jobRepository.update
                .calledWith(any())
                .mockReturnValue(RTE.right(SAVED_ADD_1_AND_2_JOB));

            jobRepository.findNextJobs.mockReturnValue(
                RT.of(List.of(SAVED_ADD_1_AND_2_JOB))
            );

            await target.start()(undefined)();

            expect(NUMBER_ADDER_EXECUTION_ERRORS.length).toBe(1);
        });

        test("Then it fails when there is no handler for the scheduled job", async () => {
            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));

            await target.start()(undefined)();

            const result = await target.schedule({
                data: {},
                name: "My Test Job",
                scheduledAt: new Date(),
                type: "test",
            })(undefined)();

            expect(E.isLeft(result)).toBe(true);
        });
    });

    describe("When a job is retried", () => {
        test("Then it should fail if the job is not failed", async () => {
            handlers.set("NumberAdder", NumberAdder(false));

            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));
            jobRepository.findById.mockReturnValue(
                RTE.right(SAVED_ADD_1_AND_2_JOB)
            );

            await target.start()(undefined)();

            const result = await target.retry(SAVED_ADD_1_AND_2_JOB.id)(
                undefined
            )();

            if (E.isRight(result)) {
                fail("Expected failure");
            } else {
                expect(result.left).toBeInstanceOf(RetryFailedError);
            }
        });

        test("Then it should use the retry interval if there was no previous failure", async () => {
            handlers.set("NumberAdder", NumberAdder(false));

            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));
            jobRepository.findById.mockReturnValue(
                RTE.right(FAILED_ADD_1_AND_2_JOB)
            );
            idProvider.generateId.mockReturnValue(CORRELATION_ID);

            await target.start()(undefined)();

            jobRepository.update.mockReturnValue(
                RTE.right(FAILED_ADD_1_AND_2_JOB)
            );

            await target.retry(FAILED_ADD_1_AND_2_JOB.id)(undefined)();

            const id = FAILED_ADD_1_AND_2_JOB.id;
            const scheduledAt = DateTime.fromJSDate(
                FAILED_ADD_1_AND_2_JOB.scheduledAt
            )
                .plus(DEFAULT_RETRY_INTERVAL)
                .toJSDate();
            const previouslyScheduledAt = FAILED_ADD_1_AND_2_JOB.scheduledAt;

            expect(jobRepository.update).toHaveBeenCalledWith({
                id,
                scheduledAt,
                previouslyScheduledAt,
                state: JobState.SCHEDULED,
                log: {
                    note: "Job rescheduled after failure.",
                },
            });
        });

        test("Then it should use the exponential backoff if there was previous failure", async () => {
            handlers.set("NumberAdder", NumberAdder(false));

            jobRepository.findNextJobs.mockReturnValue(RT.of(List.of()));
            jobRepository.findById.mockReturnValue(
                RTE.right(PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB)
            );

            await target.start()(undefined)();

            jobRepository.update.mockReturnValue(
                RTE.right(PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB)
            );

            await target.retry(PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.id)(
                undefined
            )();

            const id = PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.id;

            if (
                PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.previouslyScheduledAt ===
                undefined
            ) {
                fail("Expected previouslyScheduledAt to be defined");
            } else {
                const diff =
                    PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.scheduledAt.getTime() -
                    PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.previouslyScheduledAt.getTime();
                const previouslyScheduledAt =
                    PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.scheduledAt;
                const scheduledAt = DateTime.fromJSDate(
                    PREVIOUSLY_SCHEDULED_FAILED_ADD_1_AND_2_JOB.scheduledAt
                )
                    .plus({
                        milliseconds: diff * 2,
                    })
                    .toJSDate();

                expect(jobRepository.update).toHaveBeenCalledWith({
                    id,
                    scheduledAt,
                    previouslyScheduledAt,
                    state: JobState.SCHEDULED,
                    log: {
                        note: "Job rescheduled after failure.",
                    },
                });
            }
        });
    });
});
