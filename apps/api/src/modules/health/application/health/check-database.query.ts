import { sql, type Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';

export class CheckDatabaseQuery {
  private readonly db: Kysely<Database>;
  private readonly gate: MaintenanceGate;

  constructor(db: Kysely<Database>, gate: MaintenanceGate) {
    this.db = db;
    this.gate = gate;
  }

  // False while the gate is closed (the database file is being swapped: the answer must not wait for
  // the connection) or when the database does not answer.
  async execute(): Promise<boolean> {
    if (this.gate.isActive()) return false;
    try {
      await sql`select 1`.execute(this.db);
      return true;
    } catch {
      return false;
    }
  }
}
