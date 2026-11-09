import type { Run } from '#/modules/sync/domain/run/run.entity.ts';

// The port to the store of runs. `Executor` is the database handle: pass the one of a unit of work
// to read and write inside it.
export interface RunRepository<Executor> {
  findById(id: string, executor?: Executor): Promise<Run | null>;
  // The round of the connection that is still `running` and started at `since` or later: an older one
  // is a round the API died in the middle of, and holds nothing.
  findRunning(connectionId: string, since: string, executor?: Executor): Promise<Run | null>;
  // The most recent runs of the connection, newest first (by `startedAt`).
  listRecent(connectionId: string, limit: number, executor?: Executor): Promise<Run[]>;
  // The most recent run of each connection (any status); a connection that never ran is absent.
  findLatestOf(connectionIds: string[], executor?: Executor): Promise<Map<string, Run>>;
  // Creates or updates the run.
  save(run: Run, executor?: Executor): Promise<void>;
  // Keeps the `keep` most recent runs of the connection and deletes the rest.
  trim(connectionId: string, keep: number, executor?: Executor): Promise<void>;
  // Ends as an error every run still `running` that started before `before` (a round the API died in
  // the middle of). Answers how many.
  failInterrupted(before: string, now: string, executor?: Executor): Promise<number>;
}
