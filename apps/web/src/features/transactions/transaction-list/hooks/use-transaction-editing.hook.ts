import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { validateTransactionEdit, type TransactionEditErrors } from '@fincheck/ui';
import { useState } from 'react';

import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/features/transactions/transaction-list/types/transaction-lookups.type.ts';
import { buildCategoryOptions } from '#/features/transactions/transaction-list/utils/build-category-options.util.ts';
import { buildCounterpartOptions } from '#/features/transactions/transaction-list/utils/build-counterpart-options.util.ts';
import { buildEditValues } from '#/features/transactions/transaction-list/utils/build-edit-values.util.ts';
import { buildUpdateBody } from '#/features/transactions/transaction-list/utils/build-update-body.util.ts';
import { describeTransactionError } from '#/features/transactions/transaction-list/utils/describe-transaction-error.util.ts';
import { focusFirstInvalid } from '#/features/transactions/transaction-list/utils/focus-first-invalid.util.ts';

export const EDIT_FORM_LABEL = 'Editar transação';

type EditingArgs = {
  model: TransactionListModel;
  lookups: TransactionLookups;
  transaction: Transaction.Dto | undefined;
  close: () => void;
  recategorize: (transaction: Transaction.Dto, categoryId: string) => Promise<void>;
  askRule: (ids: string[]) => void;
};

/**
 * The in-row edit panel of one transaction: the draft values, the validation with the contract's
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
      focusFirstInvalid(EDIT_FORM_LABEL);
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
      const { field, message } = describeTransactionError(error);
      setProblem({
        id: transaction.id,
        errors: field ? { [field]: message } : {},
        message: field ? undefined : message,
      });
      focusFirstInvalid(EDIT_FORM_LABEL);
    }
  }

  return {
    transactionId: transaction.id,
    values,
    onChange: (next: typeof values) => setDraft({ id: transaction.id, values: next }),
    categories: buildCategoryOptions([...lookups.categories.values()], kind),
    counterparts: buildCounterpartOptions(
      transaction,
      model.monthTransactions.data?.items ?? model.list.data?.items ?? [],
      lookups,
    ),
    errors: mine?.errors ?? {},
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
