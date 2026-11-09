import { sql, type Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `recurrences`. `max_payments` may now be `NULL`, which reads "Quantas vierem" (PM,
// 09/11/2026): no limit of payments in the month. The numbers that exist stay as they are (1
// to 5). SQLite cannot loosen a `NOT NULL` or a `CHECK` in place, so `recurrences` is rebuilt with
// the same columns, checks and keys, and every row is copied as it is (same `id`, so the foreign
// key of `recurrence_occurrences`, the only table that points to it, keeps pointing). The foreign
// keys are off while it is rebuilt (they cannot be toggled inside a transaction, and the migrator
// of SQLite does not open one), so dropping the old table does not cascade to the occurrences; they
// are checked and turned on again after, and the migration fails, and rolls back, if a row was lost
// or a key broke. `recurrences` has no index, trigger or view of its own.
//
// `down`: back to `NOT NULL`. A recurrence that was "as many as come" (`NULL`) becomes 5 payments,
// the most the old shape allows, so nothing that arrives is left out of its month.
const COLUMNS = `id, kind, name, expected_amount_cents, amount_mode, counterparty, match_text,
  account_id, method, category_id, date_rule, day, business_day_number, tolerance_days,
  non_business_day_shift, employment_regime, is_subscription, service_slug, max_payments,
  starts_month, paused_at, archived_at, created_at, updated_at`;

// The table as the first migration made it, with the one difference: `maxPaymentsDefinition`.
function createRecurrencesSql(name: string, maxPaymentsDefinition: string): string {
  return `CREATE TABLE ${name} (
      id TEXT NOT NULL PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('income', 'expense')),
      name TEXT NOT NULL,
      expected_amount_cents INTEGER NOT NULL CHECK (expected_amount_cents > 0),
      amount_mode TEXT NOT NULL CHECK (amount_mode IN ('fixed', 'last_received')),
      counterparty TEXT,
      match_text TEXT,
      account_id TEXT REFERENCES accounts (id) ON DELETE SET NULL,
      method TEXT CHECK (method IN ('credit', 'debit', 'pix', 'cash', 'boleto', 'transfer', 'other')),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      date_rule TEXT NOT NULL CHECK (date_rule IN ('fixed_day', 'business_day', 'around_day', 'any_day')),
      day INTEGER CHECK (day BETWEEN 1 AND 31),
      business_day_number INTEGER CHECK (business_day_number BETWEEN 1 AND 23),
      tolerance_days INTEGER CHECK (tolerance_days BETWEEN 0 AND 15),
      non_business_day_shift TEXT CHECK (non_business_day_shift IN ('none', 'before', 'after')),
      employment_regime TEXT CHECK (employment_regime IN ('clt', 'pj', 'other')),
      is_subscription INTEGER NOT NULL DEFAULT 0 CHECK (is_subscription IN (0, 1)),
      service_slug TEXT,
      ${maxPaymentsDefinition},
      starts_month TEXT NOT NULL CHECK (starts_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
      paused_at TEXT,
      archived_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (date_rule <> 'fixed_day' OR day IS NOT NULL),
      CHECK (date_rule <> 'business_day' OR business_day_number IS NOT NULL),
      CHECK (date_rule <> 'around_day' OR (day IS NOT NULL AND tolerance_days IS NOT NULL)),
      CHECK ((date_rule = 'fixed_day') = (non_business_day_shift IS NOT NULL)),
      CHECK (kind = 'income' OR employment_regime IS NULL),
      CHECK (kind = 'expense' OR is_subscription = 0),
      CHECK (is_subscription = 1 OR service_slug IS NULL)
    ) STRICT`;
}

async function countRows(db: Kysely<unknown>, table: string): Promise<number> {
  const { rows } = await sql<{
    total: number;
  }>`SELECT COUNT(*) AS total FROM ${sql.table(table)}`.execute(db);

  return rows[0]?.total ?? 0;
}

// Rebuilds `recurrences` with the given `max_payments` column and copies every row with the given
// select list (the same columns, in the same order as `COLUMNS`).
async function rebuildRecurrences(
  db: Kysely<unknown>,
  maxPaymentsDefinition: string,
  copyColumns: string,
): Promise<void> {
  await sql`PRAGMA foreign_keys = OFF`.execute(db);
  try {
    await db.transaction().execute(async (trx) => {
      const recurrencesBefore = await countRows(trx, 'recurrences');
      const occurrencesBefore = await countRows(trx, 'recurrence_occurrences');

      await executeStatements(trx, [
        createRecurrencesSql('recurrences_rebuilt', maxPaymentsDefinition),
        `INSERT INTO recurrences_rebuilt (${COLUMNS}) SELECT ${copyColumns} FROM recurrences`,
        `DROP TABLE recurrences`,
        `ALTER TABLE recurrences_rebuilt RENAME TO recurrences`,
      ]);

      if (
        (await countRows(trx, 'recurrences')) !== recurrencesBefore ||
        (await countRows(trx, 'recurrence_occurrences')) !== occurrencesBefore
      ) {
        throw new Error('The recurrences migration lost a row');
      }
      const broken = (await sql`PRAGMA foreign_key_check`.execute(trx)).rows;
      if (broken.length > 0) throw new Error('The recurrences migration left a broken foreign key');
    });
  } finally {
    await sql`PRAGMA foreign_keys = ON`.execute(db);
  }
  // The dropped table leaves free pages in the file; compacting them keeps the size the stats
  // give (pages times page size) equal to the one of a backup made right after.
  await sql`VACUUM`.execute(db);
}

export async function up(db: Kysely<unknown>): Promise<void> {
  await rebuildRecurrences(
    db,
    `max_payments INTEGER CHECK (max_payments IS NULL OR max_payments BETWEEN 1 AND 5)`,
    COLUMNS,
  );
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await rebuildRecurrences(
    db,
    `max_payments INTEGER NOT NULL CHECK (max_payments BETWEEN 1 AND 5)`,
    COLUMNS.replace('max_payments', 'COALESCE(max_payments, 5)'),
  );
}
