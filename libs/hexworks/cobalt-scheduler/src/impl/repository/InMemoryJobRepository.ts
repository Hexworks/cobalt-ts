/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import { JobNotFoundError } from "../../error";
import { JobRepository, PersistedJob } from "../../JobRepository";

export const InMemoryJobRepository = (): JobRepository => {
    const jobs = new Map<string, PersistedJob<JsonObject>>();

    return {
        findByName: (name: string) => {
            if (jobs.has(name)) {
                return TE.right(jobs.get(name)!);
            } else {
                return TE.left(new JobNotFoundError(name));
            }
        },
        upsertJob: (job) => {
            const {
                correlationId,
                data,
                logData,
                name,
                note,
                scheduledAt,
                state,
                type,
            } = job;
            const log = {
                note,
                state,
                data: logData,
                createdAt: new Date(),
            };
            let toSave = jobs.get(job.name);
            if (toSave) {
                toSave.correlationId = correlationId;
                toSave.data = data;
                toSave.scheduledAt = scheduledAt;
                toSave.state = state;
                toSave.updatedAt = new Date();
                toSave.log.push(log);
            } else {
                toSave = {
                    name,
                    type,
                    correlationId,
                    data,
                    scheduledAt,
                    state,
                    currentFailCount: 0,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    log: [log],
                };
            }
            jobs.set(name, toSave);
            return TE.right(toSave as any);
        },
        loadNextJobs: () => {
            return T.of(
                Array.from(jobs.values()).filter((job) => {
                    job.scheduledAt < new Date();
                })
            );
        },
    };
};
