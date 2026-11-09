import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { DatabaseSnapshot } from '#/modules/backup/application/run/database-snapshot.interface.ts';

// A copy of the live database with `VACUUM INTO`: consistent with the WAL, made while the API is on,
// and compact (free pages are left out). It holds the one connection while it runs, so writes wait
// for it; the database of one person copies in a blink. The target must not exist.
export class SqliteDatabaseSnapshot implements DatabaseSnapshot {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async copyTo(file: string): Promise<void> {
    await sql`vacuum into ${file}`.execute(this.db);
  }
}
