import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import type { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import type { TransactionRepository } from '#/modules/transactions/domain/transaction/transaction-repository.interface.ts';
import { TransactionItem } from '#/modules/transactions/infra/transaction/transaction.item.ts';

// The transactions' store on SQLite. Every method accepts the executor of a unit of work; without
// it, it uses the default connection.
export class KyselyTransactionRepository implements TransactionRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Transaction | null> {
    const [transaction] = await this.findByIds([id], executor);

    return transaction ?? null;
  }

  async findByIds(ids: string[], executor: Kysely<Database> = this.db): Promise<Transaction[]> {
    if (ids.length === 0) return [];
    const rows = await executor
      .selectFrom('transactions')
      .selectAll()
      .where('id', 'in', ids)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findByInstallmentPlanIds(
    planIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Transaction[]> {
    if (planIds.length === 0) return [];
    const rows = await executor
      .selectFrom('transactions')
      .selectAll()
      .where('installment_plan_id', 'in', planIds)
      .execute();

    return this.hydrate(rows, executor);
  }

  async findTransferCounterpartsOfAccount(
    accountId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<Transaction[]> {
    const rows = await executor
      .selectFrom('transactions as leg')
      .innerJoin('transactions as other', 'other.id', 'leg.transfer_counterpart_id')
      .where('leg.account_id', '=', accountId)
      .where('other.account_id', '<>', accountId)
      .select('other.id')
      .execute();

    return this.findByIds(
      rows.map((row) => row.id),
      executor,
    );
  }

  async save(transaction: Transaction, executor: Kysely<Database> = this.db): Promise<void> {
    const { transaction: row, splits, tagIds } = TransactionItem.fromEntity(transaction);

    // `account_id`, `origin`, `method` and `created_at` never change, so they are not updated.
    await executor
      .insertInto('transactions')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          nature: row.nature,
          nature_set_by: row.nature_set_by,
          description: row.description,
          amount_cents: row.amount_cents,
          occurred_on: row.occurred_on,
          invoice_month: row.invoice_month ?? null,
          bank_description: row.bank_description ?? null,
          bank_amount_cents: row.bank_amount_cents ?? null,
          bank_occurred_on: row.bank_occurred_on ?? null,
          bank_counterparty: row.bank_counterparty ?? null,
          bank_status: row.bank_status ?? null,
          bank_change_json: row.bank_change_json ?? null,
          bank_changed_at: row.bank_changed_at ?? null,
          bank_removed_at: row.bank_removed_at ?? null,
          ignored_at: row.ignored_at ?? null,
          category_id: row.category_id ?? null,
          category_source: row.category_source ?? null,
          category_rule_id: row.category_rule_id ?? null,
          search_text: row.search_text,
          edit_note: row.edit_note ?? null,
          installment_plan_id: row.installment_plan_id ?? null,
          installment_number: row.installment_number ?? null,
          transfer_counterpart_id: row.transfer_counterpart_id ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    await executor
      .deleteFrom('transaction_splits')
      .where('transaction_id', '=', transaction.id)
      .execute();
    if (splits.length > 0) await executor.insertInto('transaction_splits').values(splits).execute();

    await executor
      .deleteFrom('transaction_tags')
      .where('transaction_id', '=', transaction.id)
      .execute();
    if (tagIds.length > 0) {
      await executor
        .insertInto('transaction_tags')
        .values(tagIds.map((tagId) => ({ transaction_id: transaction.id, tag_id: tagId })))
        .execute();
    }
  }

  async delete(id: string, executor: Kysely<Database> = this.db): Promise<void> {
    // Parts, tags and the links of payment go by `ON DELETE CASCADE`.
    await executor.deleteFrom('transactions').where('id', '=', id).execute();
  }

  async deleteByAccount(accountId: string, executor: Kysely<Database> = this.db): Promise<void> {
    // The parcels of the plans go with them; the other leg of a transfer is left without a link
    // by `ON DELETE SET NULL`.
    await executor.deleteFrom('installment_plans').where('account_id', '=', accountId).execute();
    await executor.deleteFrom('transactions').where('account_id', '=', accountId).execute();
  }

  private async hydrate(
    rows: Selectable<TransactionsTable>[],
    executor: Kysely<Database>,
  ): Promise<Transaction[]> {
    if (rows.length === 0) return [];
    const ids = rows.map((row) => row.id);
    const [splitRows, tagRows] = await Promise.all([
      executor
        .selectFrom('transaction_splits')
        .selectAll()
        .where('transaction_id', 'in', ids)
        .execute(),
      executor
        .selectFrom('transaction_tags')
        .selectAll()
        .where('transaction_id', 'in', ids)
        .execute(),
    ]);

    return rows.map((row) =>
      TransactionItem.toDomain(
        row,
        splitRows.filter((part) => part.transaction_id === row.id),
        tagRows.filter((tag) => tag.transaction_id === row.id).map((tag) => tag.tag_id),
      ),
    );
  }
}
