import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { sql, type Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Owner: `categories`. Five more ready-made categories asked by Lucas on 09/11/2026 (BR-CAT-001),
// taking the seed from 25 to 30, and "Impostos e taxas" becomes "Impostos" so there are not two
// fee categories. `202611081000` is never edited. The ids go on from the ones of that seed (`...19`).
//
// "Rotação entre contas" is a transfer between Lucas's own accounts, not spending: the column
// `categories.is_transfer` marks it (1 only on it), and a transaction that takes it is a `transfer`
// that keeps the category. The check of `transactions` ("only expense and income have a category")
// gains `transfer`; SQLite cannot change a check in place, so the table is rebuilt (below).
const SEED_TIMESTAMP = '2026-11-09T00:00:00.000Z';

const TAX_CATEGORY_ID = '019a5a00-0000-7000-8000-000000000017';
const TAX_OLD_NAME = 'Impostos e taxas';
const TAX_NEW_NAME = 'Impostos';

const LUCAS_CATEGORIES: {
  id: string;
  kind: 'expense';
  name: string;
  icon: string;
  isTransfer: 0 | 1;
}[] = [
  {
    id: '019a5a00-0000-7000-8000-00000000001a',
    kind: 'expense',
    name: 'Rotação entre contas',
    icon: 'transfer',
    isTransfer: 1,
  },
  {
    id: '019a5a00-0000-7000-8000-00000000001b',
    kind: 'expense',
    name: 'Estádio',
    icon: 'stadium',
    isTransfer: 0,
  },
  {
    id: '019a5a00-0000-7000-8000-00000000001c',
    kind: 'expense',
    name: 'Maconha',
    icon: 'leaf',
    isTransfer: 0,
  },
  {
    id: '019a5a00-0000-7000-8000-00000000001d',
    kind: 'expense',
    name: 'Amigos e família',
    icon: 'people',
    isTransfer: 0,
  },
  {
    id: '019a5a00-0000-7000-8000-00000000001e',
    kind: 'expense',
    name: 'Taxas',
    icon: 'receipt',
    isTransfer: 0,
  },
];

// `transactions` exactly as `202611061030` made it, but for the last check, which `categoryCheck`
// gives: before, only expense and income may have a category; now a transfer may too. A check
// cannot look at another table, so that the category of a transfer is the one with `is_transfer`
// is kept by the entity, not by the database.
const OLD_CATEGORY_CHECK = `CHECK (nature IN ('expense', 'income') OR category_id IS NULL)`;
const NEW_CATEGORY_CHECK = `CHECK (nature IN ('expense', 'income', 'transfer') OR category_id IS NULL)`;

function createTransactionsTable(name: string, categoryCheck: string): string {
  return `CREATE TABLE ${name} (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
      origin TEXT NOT NULL CHECK (origin IN ('bank', 'manual')),
      nature TEXT NOT NULL CHECK (nature IN ('expense', 'income', 'transfer', 'invoice_payment', 'balance_adjustment', 'lent', 'reimbursed')),
      nature_set_by TEXT NOT NULL CHECK (nature_set_by IN ('system', 'user')),
      method TEXT NOT NULL CHECK (method IN ('credit', 'debit', 'pix', 'cash', 'boleto', 'transfer', 'other')),
      description TEXT NOT NULL,
      amount_cents INTEGER NOT NULL,
      occurred_on TEXT NOT NULL CHECK (occurred_on = date(occurred_on)),
      invoice_month TEXT CHECK (invoice_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
      bank_description TEXT,
      bank_amount_cents INTEGER,
      bank_occurred_on TEXT CHECK (bank_occurred_on = date(bank_occurred_on)),
      bank_counterparty TEXT,
      bank_status TEXT CHECK (bank_status IN ('pending', 'posted')),
      bank_change_json TEXT,
      bank_changed_at TEXT,
      bank_removed_at TEXT,
      ignored_at TEXT,
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      category_source TEXT CHECK (category_source IN ('user', 'rule', 'recurrence', 'bill')),
      category_rule_id TEXT REFERENCES category_rules (id) ON DELETE SET NULL,
      search_text TEXT NOT NULL,
      edit_note TEXT,
      installment_plan_id TEXT REFERENCES installment_plans (id) ON DELETE CASCADE,
      installment_number INTEGER,
      transfer_counterpart_id TEXT REFERENCES transactions (id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK ((installment_plan_id IS NULL) = (installment_number IS NULL)),
      CHECK (origin = 'bank' OR bank_amount_cents IS NULL),
      ${categoryCheck}
    ) STRICT`;
}

// The columns of `transactions`, named on both sides of the copy: it does not depend on the order
// the tables happen to have them.
const TRANSACTIONS_COLUMNS = [
  'id',
  'account_id',
  'origin',
  'nature',
  'nature_set_by',
  'method',
  'description',
  'amount_cents',
  'occurred_on',
  'invoice_month',
  'bank_description',
  'bank_amount_cents',
  'bank_occurred_on',
  'bank_counterparty',
  'bank_status',
  'bank_change_json',
  'bank_changed_at',
  'bank_removed_at',
  'ignored_at',
  'category_id',
  'category_source',
  'category_rule_id',
  'search_text',
  'edit_note',
  'installment_plan_id',
  'installment_number',
  'transfer_counterpart_id',
  'created_at',
  'updated_at',
].join(', ');

const TRANSACTIONS_INDEXES = [
  `CREATE INDEX transactions_account_occurred_on_index ON transactions (account_id, occurred_on)`,
  `CREATE INDEX transactions_nature_occurred_on_index ON transactions (nature, occurred_on)`,
  `CREATE INDEX transactions_occurred_on_index ON transactions (occurred_on)`,
  `CREATE INDEX transactions_account_invoice_month_index ON transactions (account_id, invoice_month)`,
  `CREATE INDEX transactions_bank_changed_at_index ON transactions (bank_changed_at) WHERE bank_changed_at IS NOT NULL`,
  `CREATE INDEX transactions_category_id_index ON transactions (category_id)`,
  `CREATE INDEX transactions_category_rule_id_index ON transactions (category_rule_id)`,
  `CREATE UNIQUE INDEX transactions_installment_unique ON transactions (installment_plan_id, installment_number)`,
  `CREATE INDEX transactions_to_review_index ON transactions (occurred_on) WHERE category_id IS NULL AND ignored_at IS NULL AND nature IN ('expense', 'income')`,
];

// The documented way to change a check in SQLite (the 12 steps of "ALTER TABLE"): a new table with
// the new check, the rows copied, the old one dropped and the new one renamed. Foreign keys must be
// off for the drop (with them on it would delete, by cascade, the splits, tags and links that point
// to the old table); `runWithForeignKeysOff` does that and checks them again before it commits.
async function rebuildTransactions(db: Kysely<unknown>, categoryCheck: string): Promise<void> {
  await executeStatements(db, [
    createTransactionsTable('transactions_rebuilt', categoryCheck),
    `INSERT INTO transactions_rebuilt (${TRANSACTIONS_COLUMNS}) SELECT ${TRANSACTIONS_COLUMNS} FROM transactions`,
    `DROP TABLE transactions`,
    `ALTER TABLE transactions_rebuilt RENAME TO transactions`,
    ...TRANSACTIONS_INDEXES,
  ]);
}

// One transaction of the database around `work`, with the foreign keys off (a pragma that does
// nothing inside a transaction, so it goes outside) and checked before the commit. Kysely runs a
// SQLite migration on a single connection, outside any transaction (SQLite has no transactional
// DDL for it), so this is the atomicity of the migration: it all happens or none of it.
async function runWithForeignKeysOff(
  db: Kysely<unknown>,
  work: () => Promise<void>,
): Promise<void> {
  await executeStatements(db, [`PRAGMA foreign_keys = OFF`, `BEGIN`]);
  try {
    await work();
    const problems = await sql`PRAGMA foreign_key_check`.execute(db);
    if (problems.rows.length > 0) {
      throw new Error('The rebuild of `transactions` left a broken foreign key');
    }
    await executeStatements(db, [`COMMIT`]);
  } catch (error) {
    // If SQLite already rolled back by itself, this one fails: the first error is the one to show.
    await executeStatements(db, [`ROLLBACK`]).catch(() => undefined);
    throw error;
  } finally {
    await executeStatements(db, [`PRAGMA foreign_keys = ON`]);
  }
}

export async function up(db: Kysely<unknown>): Promise<void> {
  await runWithForeignKeysOff(db, async () => {
    await executeStatements(db, [
      `ALTER TABLE categories ADD COLUMN is_transfer INTEGER NOT NULL DEFAULT 0 CHECK (is_transfer IN (0, 1))`,
    ]);
    await seedCategories(db);
    await rebuildTransactions(db, NEW_CATEGORY_CHECK);
  });
}

async function seedCategories(db: Kysely<unknown>): Promise<void> {
  const rows = await sql<{ id: string; kind: string; name: string }>`
    SELECT id, kind, name FROM categories
  `
    .execute(db)
    .then((result) => result.rows);

  // Rename first, only if the row still has the original name (Lucas may have changed it) and
  // no other category already has the new one.
  const taxes = rows.find((row) => row.id === TAX_CATEGORY_ID);
  const keys = new Set(rows.map((row) => `${row.kind}|${normalizeText(row.name)}`));
  const statements: string[] = [];
  if (taxes?.name === TAX_OLD_NAME && !keys.has(`${taxes.kind}|${normalizeText(TAX_NEW_NAME)}`)) {
    statements.push(
      `UPDATE categories SET name = '${TAX_NEW_NAME}', updated_at = '${SEED_TIMESTAMP}' WHERE id = '${TAX_CATEGORY_ID}' AND name = '${TAX_OLD_NAME}'`,
    );
    keys.delete(`${taxes.kind}|${normalizeText(TAX_OLD_NAME)}`);
    keys.add(`${taxes.kind}|${normalizeText(TAX_NEW_NAME)}`);
  }

  // The same kind and name (without case or accent, the way the app compares them) is skipped.
  const missing = LUCAS_CATEGORIES.filter(
    (category) => !keys.has(`${category.kind}|${normalizeText(category.name)}`),
  );
  // A category of Lucas with the same kind and name as one that is a transfer becomes that
  // transfer: skipping it would leave the app with none.
  const rowByKey = new Map(rows.map((row) => [`${row.kind}|${normalizeText(row.name)}`, row.id]));
  for (const category of LUCAS_CATEGORIES) {
    const existing = rowByKey.get(`${category.kind}|${normalizeText(category.name)}`);
    if (category.isTransfer === 1 && existing !== undefined) {
      statements.push(`UPDATE categories SET is_transfer = 1 WHERE id = '${existing}'`);
    }
  }

  if (missing.length > 0) {
    const values = missing.map(
      (category) =>
        `('${category.id}', '${category.kind}', '${category.name}', '${category.icon}', 1, ${String(category.isTransfer)}, NULL, '${SEED_TIMESTAMP}', '${SEED_TIMESTAMP}')`,
    );
    statements.push(
      `INSERT INTO categories (id, kind, name, icon, is_default, is_transfer, archived_at, created_at, updated_at) VALUES ${values.join(', ')}`,
    );
  }

  if (statements.length > 0) await executeStatements(db, statements);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const ids = LUCAS_CATEGORIES.map((category) => `'${category.id}'`);

  await runWithForeignKeysOff(db, async () => {
    // A transfer that took the category that is a transfer keeps being a transfer, with no
    // category (what the old check allows); the rows of the category then go. Only the rows this
    // migration inserted have these ids, and only the name it set is put back: a category Lucas
    // created or renamed himself stays. Fails if a transaction (not a transfer) already uses one
    // of them: the foreign keys protect the history.
    await executeStatements(db, [
      `UPDATE transactions SET category_id = NULL, category_source = NULL, category_rule_id = NULL WHERE nature = 'transfer' AND category_id IS NOT NULL`,
    ]);
    await rebuildTransactions(db, OLD_CATEGORY_CHECK);
    await executeStatements(db, [
      `UPDATE categories SET name = '${TAX_OLD_NAME}' WHERE id = '${TAX_CATEGORY_ID}' AND name = '${TAX_NEW_NAME}'`,
      // With the foreign keys off nothing cascades: the dismissed suggestions of these categories
      // go by hand, as they would by `ON DELETE CASCADE`.
      `DELETE FROM rule_suggestions WHERE category_id IN (${ids.join(', ')})`,
      `DELETE FROM categories WHERE id IN (${ids.join(', ')})`,
      `ALTER TABLE categories DROP COLUMN is_transfer`,
    ]);
  });
}
