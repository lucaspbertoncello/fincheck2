import type { Kysely } from 'kysely';

import { executeStatements } from '#/database/execute-statements.util.ts';

// Block A, owner: `transactions`. Needs `accounts`, `categories`, `tags` and `category_rules`.
// `installment_plans` comes first: `transactions` points to it.
export async function up(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `CREATE TABLE installment_plans (
      id TEXT NOT NULL PRIMARY KEY,
      account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE RESTRICT,
      origin TEXT NOT NULL CHECK (origin IN ('bank', 'manual')),
      description TEXT NOT NULL,
      purchase_on TEXT NOT NULL CHECK (purchase_on = date(purchase_on)),
      total_cents INTEGER NOT NULL CHECK (total_cents > 0),
      installment_count INTEGER NOT NULL CHECK (installment_count BETWEEN 2 AND 48),
      first_invoice_month TEXT NOT NULL CHECK (first_invoice_month GLOB '[0-9][0-9][0-9][0-9]-[0-1][0-9]'),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    ) STRICT`,
    `CREATE INDEX installment_plans_account_purchase_count_index ON installment_plans (account_id, purchase_on, installment_count)`,

    `CREATE TABLE transactions (
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
      CHECK (nature IN ('expense', 'income') OR category_id IS NULL)
    ) STRICT`,
    `CREATE INDEX transactions_account_occurred_on_index ON transactions (account_id, occurred_on)`,
    `CREATE INDEX transactions_nature_occurred_on_index ON transactions (nature, occurred_on)`,
    `CREATE INDEX transactions_occurred_on_index ON transactions (occurred_on)`,
    `CREATE INDEX transactions_account_invoice_month_index ON transactions (account_id, invoice_month)`,
    `CREATE INDEX transactions_bank_changed_at_index ON transactions (bank_changed_at) WHERE bank_changed_at IS NOT NULL`,
    `CREATE INDEX transactions_category_id_index ON transactions (category_id)`,
    `CREATE INDEX transactions_category_rule_id_index ON transactions (category_rule_id)`,
    `CREATE UNIQUE INDEX transactions_installment_unique ON transactions (installment_plan_id, installment_number)`,
    `CREATE INDEX transactions_to_review_index ON transactions (occurred_on) WHERE category_id IS NULL AND ignored_at IS NULL AND nature IN ('expense', 'income')`,

    `CREATE TABLE transaction_splits (
      id TEXT NOT NULL PRIMARY KEY,
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      amount_cents INTEGER NOT NULL CHECK (amount_cents <> 0),
      nature TEXT NOT NULL CHECK (nature IN ('expense', 'income', 'lent', 'reimbursed')),
      category_id TEXT REFERENCES categories (id) ON DELETE RESTRICT,
      description TEXT
    ) STRICT`,
    `CREATE UNIQUE INDEX transaction_splits_transaction_position_unique ON transaction_splits (transaction_id, position)`,
    `CREATE INDEX transaction_splits_category_id_index ON transaction_splits (category_id)`,

    `CREATE TABLE transaction_tags (
      transaction_id TEXT NOT NULL REFERENCES transactions (id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags (id) ON DELETE RESTRICT,
      PRIMARY KEY (transaction_id, tag_id)
    ) STRICT`,
    `CREATE INDEX transaction_tags_tag_id_index ON transaction_tags (tag_id)`,
  ]);
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await executeStatements(db, [
    `DROP TABLE transaction_tags`,
    `DROP TABLE transaction_splits`,
    `DROP TABLE transactions`,
    `DROP TABLE installment_plans`,
  ]);
}
