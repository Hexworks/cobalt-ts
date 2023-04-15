/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as T from "fp-ts/Task";
import * as TE from "fp-ts/TaskEither";
import { JsonObject } from "type-fest";
import {
    Job,
    JobNotFoundError,
    JobRepository,
    JobState,
    JobToSave,
} from "../../";

/**
 * Reference implementation of a {@link JobRepository} that stores all jobs in memory.
 */
export const InMemoryJobRepository = (): JobRepository => {
    const jobs = new Map<string, Job<JsonObject>>();
    return {
        findByName: (name: string) => {
            const job = jobs.get(name);
            if (job) {
                return TE.right(job);
            } else {
                return TE.left(new JobNotFoundError(name));
            }
        },
        upsert: <T extends JsonObject>(job: JobToSave<T>) => {
            const {
                data,
                currentFailCount,
                previouslyScheduledAt,
                state,
                name,
                correlationId,
                scheduledAt,
                type,
                log,
            } = job;
            const existing = jobs.get(job.name);
            if (existing) {
                existing.data = data;
                existing.state = state;
                if (currentFailCount) {
                    existing.currentFailCount = currentFailCount;
                }
                existing.previouslyScheduledAt = previouslyScheduledAt;
                if (log) {
                    existing.log.push({
                        ...log,
                        state,
                        createdAt: new Date(),
                    });
                }
            } else {
                jobs.set(name, {
                    data,
                    state,
                    correlationId,
                    name,
                    scheduledAt,
                    type,
                    updatedAt: new Date(),
                    createdAt: new Date(),
                    currentFailCount: 0,
                    log: log ? [{ ...log, state, createdAt: new Date() }] : [],
                });
            }
            return TE.right(jobs.get(name)! as Job<T>);
        },
        findNextJobs: () => {
            return T.of(
                Array.from(jobs.values()).filter(
                    (job) =>
                        job.scheduledAt < new Date() &&
                        job.state === JobState.SCHEDULED
                )
            );
        },
    };
};
