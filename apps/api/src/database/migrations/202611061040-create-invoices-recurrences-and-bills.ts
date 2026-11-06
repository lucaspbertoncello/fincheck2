import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Block B, plus the dismissal of subscription suggestions. Owners: `invoices`, `recurrences`
// and `bills`. Needs `accounts`, `categories` and `transactions`.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    // invoices
    `CREATE TABLE invoices (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
      month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
      closes_on TEXT NOT NULL CHECK (closes_on = date(closes_on)),
      due_on TEXT NOT NULL CHECK (due_on = date(due_on)),
      bank_total_cents INTEGER,
      total_override_cents INTEGER CHECK (total_override_cents >= 0),
      override_note TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX invoices_account_month_unique ON invoices (account_id, month)`,
    `CREATE INDEX invoices_due_on_index ON invoices (due_on)`,

    `CREATE TABLE invoice_payments (
      id TEXT NOT NULL PRIMARY KEY,
      invoice_id TEXT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
      transaction_id TEXT REFERENCES transactions (id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      paid_on TEXT NOT NULL CHECK (paid_on = date(paid_on)),
      created_at TEXT NOT NULL
    ) STRICT`,
    `CREATE INDEX invoice_payments_invoice_id_index ON invoice_payments (invoice_id)`,
    `CREATE UNIQUE INDEX invoice_payments_transaction_id_unique ON invoice_payments (transaction_id)`,

    `CREATE TABLE invoice_payment_dismissals (
      invoice_id TEXT NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (invoice_id, transaction_id)
    ) STRICT`,

    // recurrences
    `CREATE TABLE recurrences (
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
      max_payments INTEGER NOT NULL CHECK (max_payments BETWEEN 1 AND 5),
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
    ) STRICT`,

    `CREATE TABLE recurrence_occurrences (
      id TEXT NOT NULL PRIMARY KEY,
      recurrence_id TEXT NOT NULL REFERENCES recurrences (id) ON DELETE CASCADE,
      month TEXT NOT NULL CHECK (month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
      expected_on TEXT CHECK (expected_on = date(expected_on)),
      window_start_on TEXT NOT NULL CHECK (window_start_on = date(window_start_on)),
      window_end_on TEXT NOT NULL CHECK (window_end_on = date(window_end_on)),
      expected_amount_cents INTEGER NOT NULL CHECK (expected_amount_cents > 0),
      settled_at TEXT,
      skipped_at TEXT,
      difference_decision TEXT CHECK (difference_decision IN ('updated', 'kept')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE UNIQUE INDEX recurrence_occurrences_recurrence_month_unique ON recurrence_occurrences (recurrence_id, month)`,
    `CREATE INDEX recurrence_occurrences_month_index ON recurrence_occurrences (month)`,
    `CREATE INDEX recurrence_occurrences_expected_on_index ON recurrence_occurrences (expected_on)`,

    `CREATE TABLE occurrence_payments (
      id TEXT NOT NULL PRIMARY KEY,
      occurrence_id TEXT NOT NULL REFERENCES recurrence_occurrences (id) ON DELETE CASCADE,
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      linked_by TEXT NOT NULL CHECK (linked_by IN ('auto', 'user')),
      created_at TEXT NOT NULL
    ) STRICT`,
    `CREATE INDEX occurrence_payments_occurrence_id_index ON occurrence_payments (occurrence_id)`,
    `CREATE UNIQUE INDEX occurrence_payments_transaction_id_unique ON occurrence_payments (transaction_id)`,

    `CREATE TABLE subscription_suggestion_dismissals (
      pattern TEXT NOT NULL,
      account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
      dismissed_at TEXT NOT NULL,
      PRIMARY KEY (pattern, account_id)
    ) STRICT`,

    // bills
    `CREATE TABLE bills (
      id TEXT NOT NULL PRIMARY KEY,
      direction TEXT NOT NULL CHECK (direction IN ('payable', 'receivable')),
      kind TEXT NOT NULL CHECK (kind IN ('general', 'friend')),
      description TEXT NOT NULL,
      counterparty TEXT,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      due_on TEXT CHECK (due_on = date(due_on)),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      origin_transaction_id TEXT REFERENCES transactions (id) ON DELETE SET NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK (kind <> 'friend' OR counterparty IS NOT NULL)
    ) STRICT`,
    `CREATE INDEX bills_due_on_index ON bills (due_on)`,

    `CREATE TABLE bill_payments (
      id TEXT NOT NULL PRIMARY KEY,
      bill_id TEXT NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
      transaction_id TEXT REFERENCES transactions (id) ON DELETE CASCADE,
      amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
      paid_on TEXT NOT NULL CHECK (paid_on = date(paid_on)),
      created_at TEXT NOT NULL
    ) STRICT`,
    `CREATE INDEX bill_payments_bill_id_index ON bill_payments (bill_id)`,
    `CREATE UNIQUE INDEX bill_payments_transaction_id_unique ON bill_payments (transaction_id)`,

    `CREATE TABLE bill_payment_dismissals (
      bill_id TEXT NOT NULL REFERENCES bills (id) ON DELETE CASCADE,
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (bill_id, transaction_id)
    ) STRICT`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `DROP TABLE bill_payment_dismissals`,
    `DROP TABLE bill_payments`,
    `DROP TABLE bills`,
    `DROP TABLE subscription_suggestion_dismissals`,
    `DROP TABLE occurrence_payments`,
    `DROP TABLE recurrence_occurrences`,
    `DROP TABLE recurrences`,
    `DROP TABLE invoice_payment_dismissals`,
    `DROP TABLE invoice_payments`,
    `DROP TABLE invoices`,
  ]);
}
