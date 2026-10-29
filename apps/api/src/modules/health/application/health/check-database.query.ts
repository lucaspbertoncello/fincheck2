import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

export class CheckDatabaseQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(): Promise<boolean> {
    try {
      await sql`select 1`.execute(this.db);
      return true;
    } catch {
      return false;
    }
  }
}
