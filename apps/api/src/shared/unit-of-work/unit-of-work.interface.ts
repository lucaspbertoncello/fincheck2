// The port to a transaction. `run` opens one, hands the executor to `work` and commits when it
// returns, or rolls back when it throws. Every write that depends on a read, and every write that
// crosses contexts, runs inside one; a use case of another context receives the executor.
// `Executor` is the database handle (Kysely, in the implementation under `database/`).
export interface UnitOfWork<Executor> {
  run<Result>(work: (executor: Executor) => Promise<Result>): Promise<Result>;
}
