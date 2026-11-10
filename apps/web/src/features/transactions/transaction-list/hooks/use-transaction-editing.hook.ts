import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import type { TagPickerProps, TransactionEditErrors } from '@fincheck/ui';
import { useState } from 'react';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';

import { getAcceptedCategoryKinds } from '#/domain/transactions/transaction/rules/get-accepted-category-kinds.rule.ts';
import { getEditAmountPresentation } from '#/domain/transactions/transaction/rules/get-edit-amount-presentation.rule.ts';
import { validateTransactionEdit } from '#/domain/transactions/transaction/rules/validate-transaction-edit.rule.ts';
import type { TransactionListModel } from '#/features/transactions/transaction-list/transaction-list.model.ts';
import type { TransactionLookups } from '#/shared/types/transactions/transaction-lookups.type.ts';
import { CREDIT_AMOUNT_NOTE } from '#/shared/constants/transactions/credit-category-groups.constant.ts';
import { buildCategoryOptionsForKinds } from '#/shared/utils/transactions/build-category-options-for-kinds.util.ts';
import { buildCategoryOptions } from '#/shared/utils/transactions/build-category-options.util.ts';
import { buildCounterpartOptions } from '#/features/transactions/transaction-list/utils/build-counterpart-options.util.ts';
import { buildEditValues } from '#/features/transactions/transaction-list/utils/build-edit-values.util.ts';
import { describeEditError } from '#/features/transactions/transaction-list/utils/describe-edit-error.util.ts';
import { buildUpdateBody } from '#/features/transactions/transaction-list/utils/build-update-body.util.ts';
import { hasApiErrorCode } from '#/shared/api/api.error.ts';
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
 * rules (R6: nature and the other leg of a transfer), the tags of the category of the transaction
 * (picked or created on the spot, in that category) and the save. A save that only picks a category goes through the recategorize
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
  // Tags made in this modal, until the list of tags catches up with them.
  const [created, setCreated] = useState<Tag.Dto[]>([]);
  const [problem, setProblem] = useState<{
    id: string;
    errors: TransactionEditErrors;
    message?: string;
  }>();

  if (!transaction) return null;

  const values = draft?.id === transaction.id ? draft.values : buildEditValues(transaction);
  const mine = problem?.id === transaction.id ? problem : undefined;
  const kind = values.nature === 'income' ? 'income' : 'expense';
  const isCardAccount = lookups.accounts.get(transaction.accountId)?.type === 'credit_card';
  // The sign and tone of the amount, and the note under it, follow the form (the nature and the
  // category picked), not only what was saved.
  const amount = getEditAmountPresentation({
    nature: values.nature,
    amountCents: transaction.amountCents,
    isCardAccount,
    categoryKind: values.categoryId
      ? (lookups.categories.get(values.categoryId)?.kind ?? null)
      : null,
  });
  // The kinds the transaction takes: its nature's, or both for a credit on a card (a refund).
  const kindsOf = (nature: 'expense' | 'income') =>
    getAcceptedCategoryKinds({
      nature,
      amountCents: transaction.amountCents,
      isCardAccount,
      isSplit: false,
    });

  // A transfer that is one by its category ("Rotação entre contas") shows that category next to
  // the other leg, and the other leg is optional.
  const transferByCategory = transaction.nature === 'transfer' && transaction.categoryId !== null;
  const allCategories = [...lookups.categories.values()];

  // Switching the nature drops the category that no longer fits: one of the other kind going to
  // expense or income, any but the one that is a transfer going to a transfer, and the one that
  // is a transfer leaving it (the nature no longer comes from it). A credit on a card keeps a
  // category of either kind.
  function withValidCategory(next: typeof values): typeof values {
    if (next.nature === values.nature || !next.categoryId) return next;
    const category = lookups.categories.get(next.categoryId);
    // A credit on a card that was income by its category and goes back to expense lets go of that
    // category: the API does the same, and the form shows it.
    if (isCardAccount && values.nature === 'income' && next.nature === 'expense') {
      return category?.kind === 'income' ? { ...next, categoryId: null } : next;
    }
    if (next.nature === 'transfer') {
      return category?.isTransfer === true ? next : { ...next, categoryId: null };
    }
    if (next.nature !== 'expense' && next.nature !== 'income') return next;
    return category && kindsOf(next.nature).includes(category.kind) && category.isTransfer !== true
      ? next
      : { ...next, categoryId: null };
  }

  // The categories of the transaction: its own or, when it is split, the ones of its parts. The
  // tags a transaction takes are the ones of those categories.
  const isSplit = transaction.splits.length > 0;
  const categoryIds = [
    ...new Set(
      isSplit
        ? transaction.splits.flatMap((part) => (part.categoryId ? [part.categoryId] : []))
        : values.categoryId
          ? [values.categoryId]
          : [],
    ),
  ];
  const categoryId = categoryIds.length === 1 ? categoryIds[0] : null;
  const categoryName =
    categoryIds.length > 0
      ? categoryIds.map((id) => lookups.categories.get(id)?.name ?? '').join(', ')
      : null;
  const knownTags = new Map<string, Tag.Dto>(lookups.tags);
  for (const tag of created) knownTags.set(tag.id, tag);
  // The name is only unique inside a category: with several, each tag says which one is its own.
  const labelOfTag = (tag: Tag.Dto) =>
    categoryIds.length > 1
      ? `${tag.name} · ${lookups.categories.get(tag.categoryId)?.name ?? ''}`
      : tag.name;
  const tagOptions = [...knownTags.values()]
    .filter((tag) => categoryIds.includes(tag.categoryId) && tag.archivedAt === null)
    .map((tag) => ({ id: tag.id, name: labelOfTag(tag) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
  const tagsStatus =
    model.tags.isError && !model.tags.data ? 'error' : model.tags.isPending ? 'loading' : 'ready';

  const tagPicker: Omit<TagPickerProps, 'label' | 'className'> = {
    categoryName,
    noCategoryMessage: isSplit
      ? 'Categorize uma das partes da divisão antes de usar tags: cada tag pertence a uma categoria.'
      : undefined,
    options: tagOptions,
    // With several categories no tag can be started from here: the fixed line would only fail.
    offersNewLine: Boolean(categoryId),
    selected: values.tagIds.flatMap((id) => {
      const tag = knownTags.get(id);
      return tag ? [{ id: tag.id, name: labelOfTag(tag) }] : [];
    }),
    onChange: (tagIds) => setDraft({ id: transaction.id, values: { ...values, tagIds } }),
    onCreate: async (name) => {
      if (!categoryId) {
        throw new Error(
          categoryIds.length > 1
            ? 'Esta transação está dividida em várias categorias: crie a tag em Categorias.'
            : 'Escolha a categoria antes de criar uma tag.',
        );
      }
      try {
        const tag = await model.createTag.mutateAsync({ categoryId, name });
        setCreated((current) => [...current, tag]);
        return tag.id;
      } catch (error) {
        throw new Error(
          hasApiErrorCode(error, 'TAG_NAME_TAKEN')
            ? 'Já existe uma tag com esse nome nessa categoria (pode estar arquivada).'
            : 'Não deu para criar a tag. Tente de novo.',
          { cause: error },
        );
      }
    },
    status: tagsStatus,
    onRetry: () => void model.tags.refetch(),
  };

  // The tags belong to the category: another category, or none, leaves them behind. A split
  // transaction has no category of its own (its parts have), so its tags stay.
  function withTagsOfCategory(next: typeof values): typeof values {
    if (isSplit) return next;
    return next.categoryId === values.categoryId || next.tagIds.length === 0
      ? next
      : { ...next, tagIds: [] };
  }

  async function save() {
    if (!transaction) return;
    const errors = validateTransactionEdit(values, { legOptional: transferByCategory });
    if (Object.keys(errors).length > 0) {
      setProblem({ id: transaction.id, errors });
      focusFirstInvalid();
      return;
    }
    try {
      const body = buildUpdateBody(transaction, values);
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
      // What was saved is the truth now: a credit on a card may have changed nature with its category.
      setDraft(undefined);
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
      setDraft({ id: transaction.id, values: withTagsOfCategory(withValidCategory(next)) }),
    tagPicker,
    // The API never makes income of a transaction on a card by hand ("Crédito no cartão nunca é
    // receita"): one that is income already (by its category) keeps showing it.
    canBeIncome: !isCardAccount || transaction.nature === 'income',
    // The category that is a transfer fits both legs of a rotation, so it shows for any kind.
    categories: buildCategoryOptionsForKinds(allCategories, kindsOf(kind), { withTransfer: true }),
    // On a credit on a card (both kinds) a new category abates the spending, the first group.
    categoryKind: kindsOf(kind)[0] ?? kind,
    transferCategories: transferByCategory
      ? buildCategoryOptions(
          allCategories.filter((category) => category.isTransfer),
          'expense',
          { withTransfer: true },
        )
      : [],
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
    amount: { tone: amount.tone, note: amount.note ? CREDIT_AMOUNT_NOTE : undefined },
    formError: mine?.message,
    original:
      transaction.isEdited && transaction.bank
        ? { description: transaction.bank.description, amountCents: transaction.bank.amountCents }
        : undefined,
    saving: model.updateTransaction.isPending,
    canDelete: transaction.origin === 'manual' && transaction.installment === null,
    save,
  };
}
