import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import type {
  RowDetailView,
  TransactionRowView,
} from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import { buildTransactionRow } from '#/features/transactions/transaction-list/utils/build-transaction-row.util.ts';
import { formatDayShortMonth } from '#/features/transactions/transaction-list/utils/format-day-short-month.util.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

function describeBankChange(change: Transaction.BankChangeDto['changes'][number]): string {
  if (change.field === 'description') {
    return `O banco mudou a descrição de “${change.before}” para “${change.after}” depois da sua edição.`;
  }
  if (change.field === 'occurredOn') {
    return `O banco mudou a data de ${formatDayShortMonth(String(change.before))} para ${formatDayShortMonth(String(change.after))} depois da sua edição.`;
  }
  return '';
}

function buildDetails(transaction: Transaction.Dto, lookups: TransactionLookups): RowDetailView[] {
  const details: RowDetailView[] = [];
  const bank = transaction.bank;
  const yourCents = Math.abs(transaction.amountCents);

  if (transaction.bankChange && bank) {
    const amount = transaction.bankChange.changes.find((change) => change.field === 'amountCents');
    const other = transaction.bankChange.changes.find((change) => change.field !== 'amountCents');
    details.push({
      kind: 'bank-change',
      amount:
        amount?.field === 'amountCents'
          ? { before: Number(amount.before), after: Number(amount.after) }
          : undefined,
      text: other ? describeBankChange(other) : undefined,
      bankName: bank.description,
      bankCents: Math.abs(bank.amountCents),
      yourName: transaction.description,
      yourCents,
    });
  } else if (transaction.isEdited && bank) {
    details.push({
      kind: 'edited',
      bankName: bank.description,
      bankCents: Math.abs(bank.amountCents),
      yourName: transaction.description,
      yourCents,
      note: transaction.editNote ?? undefined,
    });
  }

  if (transaction.removedByBankAt && transaction.isEdited) details.push({ kind: 'bank-removed' });

  const suggested = transaction.categorySuggestion
    ? lookups.categories.get(transaction.categorySuggestion)
    : undefined;
  if (transaction.isInReview && suggested) {
    details.push({
      kind: 'suggestion',
      category: { id: suggested.id, name: suggested.name, icon: mapCategoryIcon(suggested.icon) },
    });
  }

  return details;
}

/** A transaction with the boxes that go under its row. */
export function buildRowView(
  transaction: Transaction.Dto,
  lookups: TransactionLookups,
): TransactionRowView {
  return {
    row: buildTransactionRow(transaction, lookups),
    details: buildDetails(transaction, lookups),
  };
}
