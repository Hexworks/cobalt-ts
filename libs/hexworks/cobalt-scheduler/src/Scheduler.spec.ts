import { sleep } from "@hexworks/cobalt-core";
import { Map } from "immutable";
import { mock, MockProxy } from "jest-mock-extended";
import { Duration } from "luxon";
import { JsonObject } from "type-fest";
import { JobHandler } from "./job";
import { JobRepository } from "./JobRepository";
import { Scheduler } from "./Scheduler";

const jobCheckInterval = Duration.fromMillis(10);

describe("Given a Scheduler", () => {
    let jobRepository: MockProxy<JobRepository>;
    let handlers: Map<string, JobHandler<JsonObject>>;
    let target: Scheduler;

    beforeEach(() => {
        jobRepository = mock<JobRepository>();
        handlers = Map();
        target = Scheduler({
            jobRepository,
            handlers,
            jobCheckInterval,
        });
    });

    test("When it is started, Then it should check for jobs according to the config", async () => {
        await target.start()();

        await sleep(1000)();
    });
});
