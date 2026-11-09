import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TransactionEditErrors } from '@fincheck/ui';
import { useState } from 'react';

import { getTransactionDirection } from '#/domain/transactions/transaction/rules/get-transaction-direction.rule.ts';
import { validateTransactionEdit } from '#/domain/transactions/transaction/rules/validate-transaction-edit.rule.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { buildCategoryOptions } from '#/features/transactions/utils/build-category-options.util.ts';
import { buildCounterpartOptions } from '#/features/transactions/transaction-list/utils/build-counterpart-options.util.ts';
import { buildEditValues } from '#/features/transactions/transaction-list/utils/build-edit-values.util.ts';
import { describeEditError } from '#/features/transactions/transaction-list/utils/describe-edit-error.util.ts';
import { buildUpdateBody } from '#/features/transactions/transaction-list/utils/build-update-body.util.ts';
import { focusFirstInvalid } from '#/features/transactions/utils/focus-first-invalid.util.ts';

function describeOrigin(transaction: Transaction.Dto, lookups: TransactionLookups): string {
  const account = lookups.accounts.get(transaction.accountId)?.name ?? 'sua conta';
  return transaction.origin === 'manual'
    ? `Lançada à mão em ${account}.`
    : `Veio de ${account}. O original do banco fica guardado.`;
}

type EditingArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  transaction: Transaction.Dto | undefined;
  close: () => void;
  recategorize: (transaction: Transaction.Dto, categoryId: string) => Promise<void>;
  askRule: (ids: string[]) => void;
};

/**
 * The edit modal of one transaction: the draft values, the validation with the contract's
 * rules (R6: nature and the other leg of a transfer), the tags by name turned into ids (new names
 * become new tags) and the save. A save that only picks a category goes through the recategorize
 * route, which brings the undo and the rule question.
 */
export function useTransactionEditing({
  model,
  lookups,
  transaction,
  close,
  recategorize,
  askRule,
}: EditingArgs) {
  const [draft, setDraft] = useState<{ id: string; values: ReturnType<typeof buildEditValues> }>();
  const [problem, setProblem] = useState<{
    id: string;
    errors: TransactionEditErrors;
    message?: string;
  }>();

  if (!transaction) return null;

  const values =
    draft?.id === transaction.id ? draft.values : buildEditValues(transaction, lookups);
  const mine = problem?.id === transaction.id ? problem : undefined;
  const kind = values.nature === 'income' ? 'income' : 'expense';

  // Switching between expense and income drops a category of the other kind.
  function withValidCategory(next: typeof values): typeof values {
    if (next.nature === values.nature || !next.categoryId) return next;
    if (next.nature !== 'expense' && next.nature !== 'income') return next;
    return lookups.categories.get(next.categoryId)?.kind === next.nature
      ? next
      : { ...next, categoryId: null };
  }

  async function resolveTagIds(names: readonly string[]): Promise<string[]> {
    const existing = new Map(
      [...lookups.tags.values()].map((tag) => [tag.name.toLowerCase(), tag]),
    );
    const ids: string[] = [];
    for (const name of names) {
      const found = existing.get(name.toLowerCase());
      ids.push(found ? found.id : (await model.createTag.mutateAsync({ name })).id);
    }
    return ids;
  }

  async function save() {
    if (!transaction) return;
    const errors = validateTransactionEdit(values);
    if (Object.keys(errors).length > 0) {
      setProblem({ id: transaction.id, errors });
      focusFirstInvalid();
      return;
    }
    try {
      const body = buildUpdateBody(transaction, values, await resolveTagIds(values.tags));
      if (!body) {
        close();
        return;
      }
      const onlyCategory = Object.keys(body).length === 1 && body.categoryId;
      if (onlyCategory && body.categoryId) {
        await recategorize(transaction, body.categoryId);
      } else {
        await model.updateTransaction.mutateAsync({ id: transaction.id, body });
        if (body.categoryId) askRule([transaction.id]);
      }
      close();
    } catch (error) {
      const { field, message } = describeEditError(error);
      setProblem({
        id: transaction.id,
        errors: field ? { [field]: message } : {},
        message: field ? undefined : message,
      });
      focusFirstInvalid();
    }
  }

  return {
    transactionId: transaction.id,
    values,
    onChange: (next: typeof values) =>
      setDraft({ id: transaction.id, values: withValidCategory(next) }),
    categories: buildCategoryOptions([...lookups.categories.values()], kind),
    counterparts: buildCounterpartOptions(
      transaction,
      model.monthTransactions.data?.items ??
        model.list.data?.items ??
        model.periodList.data?.pages.flatMap((page) => page.items) ??
        [],
      lookups,
    ),
    errors: mine?.errors ?? {},
    description: describeOrigin(transaction, lookups),
    direction: getTransactionDirection(transaction.amountCents),
    formError: mine?.message,
    original:
      transaction.isEdited && transaction.bank
        ? { description: transaction.bank.description, amountCents: transaction.bank.amountCents }
        : undefined,
    saving: model.updateTransaction.isPending || model.createTag.isPending,
    canDelete: transaction.origin === 'manual' && transaction.installment === null,
    save,
  };
}
