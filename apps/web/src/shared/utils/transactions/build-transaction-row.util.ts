import type { Category } from '@fincheck/shared/categories/category/category.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionRowData } from '@fincheck/ui';

import { TRANSACTION_METHOD_LABELS } from '#/shared/constants/transactions/transaction-method-labels.constant.ts';
import { isCountingNature } from '#/domain/transactions/transaction/rules/is-counting-nature.rule.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';

function accountLabel(transaction: Transaction.Dto, lookups: TransactionLookups): string {
  const account = lookups.accounts.get(transaction.accountId);
  const method = TRANSACTION_METHOD_LABELS[transaction.method];
  return account ? `${account.name}, ${method}` : method;
}

// The category chips of a split transaction: one per part, in order and without repeats; a part that
// is a debt with a friend says so, one with no category says "Sem categoria".
function describeSplitCategories(
  transaction: Transaction.Dto,
  lookups: TransactionLookups,
): string[] {
  const names = [...transaction.splits]
    .sort((a, b) => a.position - b.position)
    .map((part) =>
      part.nature === 'lent' || part.nature === 'reimbursed'
        ? OUT_OF_ACCOUNT_LABELS[part.nature]
        : ((part.categoryId ? lookups.categories.get(part.categoryId)?.name : undefined) ??
          'Sem categoria'),
    );

  return [...new Set(names)];
}

// The category chip of a transaction that is not split ("" has none).
function describeCategory(
  transaction: Transaction.Dto,
  category: Category.Dto | null | undefined,
  counts: boolean,
): string {
  if (counts) return category?.name ?? '';
  // A transfer made by the category that is a transfer says which one.
  if (transaction.nature === 'transfer' && category) return category.name;

  return OUT_OF_ACCOUNT_LABELS[transaction.nature];
}

/** A transaction of the contract as its list row draws it. */
export function buildTransactionRow(
  transaction: Transaction.Dto,
  lookups: TransactionLookups,
): TransactionRowData {
  const counts = isCountingNature(transaction.nature);
  const isSplit = transaction.splits.length > 0;
  const category = transaction.categoryId ? lookups.categories.get(transaction.categoryId) : null;
  const tags = transaction.tagIds
    .map((id) => lookups.tags.get(id)?.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const uncategorized = counts && !category && !isSplit;
  const bill = transaction.links.bill;

  return {
    id: transaction.id,
    name: transaction.description,
    kind: transaction.nature === 'income' ? 'income' : counts ? 'expense' : 'transfer',
    amountCents: transaction.amountCents,
    categoryIcon: isSplit
      ? 'split'
      : counts
        ? mapCategoryIcon(category?.icon)
        : transaction.nature === 'transfer'
          ? 'transfer'
          : 'history',
    uncategorized,
    categoryNames: isSplit
      ? describeSplitCategories(transaction, lookups)
      : [describeCategory(transaction, category, counts)].filter(Boolean),
    accountLabel: accountLabel(transaction, lookups),
    tags,
    installment: transaction.installment
      ? { number: transaction.installment.number, total: transaction.installment.count }
      : undefined,
    pending: transaction.bank?.status === 'pending',
    toReview: transaction.isInReview,
    edited: transaction.isEdited,
    bankChanged: transaction.bankChange !== null,
    splitParts: isSplit ? transaction.splits.length : undefined,
    outOfAccount: !counts,
    ignored: transaction.ignoredAt !== null,
    recurring: transaction.links.occurrence !== null,
    debtPaidCents: bill?.role === 'payment' ? bill.amountCents : undefined,
    debtPerson: bill?.role === 'payment' ? (bill.counterparty ?? undefined) : undefined,
  };
}

// What a row says in place of a category when the transaction is out of the account.
const OUT_OF_ACCOUNT_LABELS: Record<Transaction.Dto['nature'], string> = {
  expense: '',
  income: '',
  transfer: 'Transferência entre contas',
  invoice_payment: 'Pagamento de fatura',
  balance_adjustment: 'Ajuste de saldo',
  lent: 'Dívida com amigo',
  reimbursed: 'Dívida com amigo',
};
