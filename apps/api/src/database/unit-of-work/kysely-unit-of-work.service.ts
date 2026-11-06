import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// The unit of work over the SQLite connection. The transaction opens with `BEGIN IMMEDIATE`, which
// takes the write lock at once: a read that decides a write cannot go stale because another writer
// slipped in between (Kysely's own `transaction()` would open a deferred `BEGIN`).
// The executor is bound to the one connection that holds the transaction; inside `work`, use only
// it, never the root `db` (that would wait for the lock this very call is holding).
export class KyselyUnitOfWork implements UnitOfWork<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async run<Result>(work: (executor: Kysely<Database>) => Promise<Result>): Promise<Result> {
    return this.db.connection().execute(async (executor) => {
      await sql`begin immediate`.execute(executor);
      try {
        const result = await work(executor);
        await sql`commit`.execute(executor);
        return result;
      } catch (error) {
        // A failed rollback must not hide the error that caused it.
        await sql`rollback`.execute(executor).catch(() => undefined);
        throw error;
      }
    });
  }
}
