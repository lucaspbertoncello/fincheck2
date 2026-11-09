import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { DatabaseSizeReader } from '#/modules/backup/application/stats/database-size-reader.interface.ts';

// The logical size of the database: pages times page size, what a backup made now would weigh (a
// `VACUUM INTO` copy has the same pages). It does not read the files: the `-wal` keeps the largest
// size it ever had until a checkpoint truncates it, so adding it up would show the peak of the
// session, not the data.
export class SqliteDatabaseSizeReader implements DatabaseSizeReader {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async readBytes(): Promise<number> {
    const { rows } = await sql<{
      bytes: number;
    }>`select (select page_count from pragma_page_count) * (select page_size from pragma_page_size) as bytes`.execute(
      this.db,
    );

    return Number(rows[0]?.bytes ?? 0);
  }
}
