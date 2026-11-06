import { transactionBankChangeDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import type { Insertable, Selectable } from 'kysely';

import type { TransactionSplitsTable } from '#/database/tables/transactions/transaction-splits-table.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionSplit } from '#/modules/transactions/domain/transaction/transaction-split.value-object.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The aggregate as rows: one of `transactions`, the ones of `transaction_splits` and the ids that
// go to `transaction_tags`. The change of the bank is a JSON in a column (never filtered), with the
// instant of the detection in its own column.
export class TransactionItem {
  static fromEntity(transaction: Transaction): TransactionItem.Rows {
    return {
      transaction: {
        id: transaction.id,
        account_id: transaction.accountId,
        origin: transaction.origin,
        nature: transaction.nature,
        nature_set_by: transaction.natureSetBy,
        method: transaction.method,
        description: transaction.description,
        amount_cents: transaction.amount.cents,
        occurred_on: transaction.occurredOn.value,
        invoice_month: transaction.invoiceMonth?.value ?? null,
        bank_description: transaction.bank?.description ?? null,
        bank_amount_cents: transaction.bank?.amount.cents ?? null,
        bank_occurred_on: transaction.bank?.occurredOn.value ?? null,
        bank_counterparty: transaction.bank?.counterparty ?? null,
        bank_status: transaction.bank?.status ?? null,
        bank_change_json: transaction.bankChange
          ? JSON.stringify(transaction.bankChange.changes)
          : null,
        bank_changed_at: transaction.bankChange?.detectedAt ?? null,
        bank_removed_at: transaction.removedByBankAt,
        ignored_at: transaction.ignoredAt,
        category_id: transaction.categoryId,
        category_source: transaction.categorySource,
        category_rule_id: transaction.categoryRuleId,
        search_text: transaction.searchText(),
        edit_note: transaction.editNote,
        installment_plan_id: transaction.installment?.planId ?? null,
        installment_number: transaction.installment?.number ?? null,
        transfer_counterpart_id: transaction.transferCounterpartId,
        created_at: transaction.createdAt,
        updated_at: transaction.updatedAt,
      },
      splits: transaction.splits.map((part) => ({
        id: part.id,
        transaction_id: transaction.id,
        position: part.position,
        amount_cents: part.amount.cents,
        nature: part.nature,
        category_id: part.categoryId,
        description: part.description,
      })),
      tagIds: transaction.tagIds,
    };
  }

  static toDomain(
    row: Selectable<TransactionsTable>,
    splits: Selectable<TransactionSplitsTable>[],
    tagIds: string[],
  ): Transaction {
    const hasBank =
      row.bank_description !== null &&
      row.bank_amount_cents !== null &&
      row.bank_occurred_on !== null &&
      row.bank_status !== null;

    return new Transaction({
      id: row.id,
      accountId: row.account_id,
      origin: row.origin,
      nature: row.nature,
      natureSetBy: row.nature_set_by,
      method: row.method,
      description: row.description,
      amount: Money.fromCents(row.amount_cents),
      occurredOn: BusinessDate.of(row.occurred_on),
      invoiceMonth: row.invoice_month === null ? null : Month.of(row.invoice_month),
      bank:
        hasBank && row.bank_amount_cents !== null && row.bank_status !== null
          ? {
              description: row.bank_description ?? '',
              amount: Money.fromCents(row.bank_amount_cents),
              occurredOn: BusinessDate.of(row.bank_occurred_on ?? row.occurred_on),
              counterparty: row.bank_counterparty,
              status: row.bank_status,
            }
          : null,
      bankChange:
        row.bank_change_json !== null && row.bank_changed_at !== null
          ? {
              detectedAt: row.bank_changed_at,
              changes: transactionBankChangeDtoSchema.shape.changes.parse(
                JSON.parse(row.bank_change_json),
              ),
            }
          : null,
      removedByBankAt: row.bank_removed_at,
      ignoredAt: row.ignored_at,
      categoryId: row.category_id,
      categorySource: row.category_source,
      categoryRuleId: row.category_rule_id,
      editNote: row.edit_note,
      installment:
        row.installment_plan_id !== null && row.installment_number !== null
          ? { planId: row.installment_plan_id, number: row.installment_number }
          : null,
      transferCounterpartId: row.transfer_counterpart_id,
      splits: [...splits]
        .sort((a, b) => a.position - b.position)
        .map(
          (part) =>
            new TransactionSplit({
              id: part.id,
              position: part.position,
              amount: Money.fromCents(part.amount_cents),
              nature: part.nature,
              categoryId: part.category_id,
              description: part.description,
            }),
        ),
      tagIds,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace TransactionItem {
  export type Rows = {
    transaction: Insertable<TransactionsTable>;
    splits: Insertable<TransactionSplitsTable>[];
    tagIds: string[];
  };
}
