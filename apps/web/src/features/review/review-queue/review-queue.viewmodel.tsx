import {
  useToast,
  type CategoryOption,
  type IconName,
  type ReviewChoice,
  type TagPickerProps,
} from '@fincheck/ui';
import type { Tag } from '@fincheck/shared/categories/tag/tag.type.ts';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { useLinkReviewPayment } from '#/features/review/review-queue/hooks/use-link-review-payment.hook.ts';
import { useReviewRuleSuggestion } from '#/features/review/review-queue/hooks/use-review-rule-suggestion.hook.ts';
import { describeRuleSuggestion } from '#/shared/utils/rules/describe-rule-suggestion.util.ts';
import { useSaveReviewEntry } from '#/features/review/review-queue/hooks/use-save-review-entry.hook.ts';
import { useUndoReviewEntry } from '#/features/review/review-queue/hooks/use-undo-review-entry.hook.ts';
import {
  useReviewQueueModel,
  useReviewRuleModel,
} from '#/features/review/review-queue/review-queue.model.ts';
import type {
  ReviewDraft,
  ReviewedEntry,
} from '#/features/review/review-queue/review-queue.type.ts';
import {
  ReviewQueueView,
  type ReviewQueueViewProps,
} from '#/features/review/review-queue/review-queue.view.tsx';
import { getTransactionDirection } from '#/domain/transactions/transaction/rules/get-transaction-direction.rule.ts';
import { buildAmbiguity } from '#/features/review/review-queue/utils/build-ambiguity.util.ts';
import { buildTransactionDetail } from '#/features/review/review-queue/utils/build-transaction-detail.util.ts';
import { countRuleCatches } from '#/domain/transactions/review-queue/rules/count-rule-catches.rule.ts';
import { orderQueue } from '#/domain/transactions/review-queue/rules/order-queue.rule.ts';
import { mapCategoryIcon } from '#/domain/categories/category/rules/map-category-icon.rule.ts';
import { hasApiErrorCode } from '#/shared/api/api.error.ts';
import { useSelectedMonth } from '#/shared/hooks/use-selected-month.hook.ts';

const LISTED_IN_QUEUE = 8;
const MIN_PATTERN_LENGTH = 2;

/** The queue of the selected month. A new month starts a new visit (progress, skips, history). */
export function ReviewQueueViewModel() {
  const { month } = useSelectedMonth();

  return <ReviewVisit key={month} month={month} />;
}

function ReviewVisit({ month }: { month: string }) {
  const navigate = useNavigate();
  const { showUndoToast } = useToast();
  const model = useReviewQueueModel(month);

  const [skippedIds, setSkippedIds] = useState<string[]>([]);
  const [promotedId, setPromotedId] = useState<string | null>(null);
  const [reviewed, setReviewed] = useState<ReviewedEntry[]>([]);
  // The saved entry "Voltar à anterior" reopened; null while on the live queue.
  const [cursor, setCursor] = useState<number | null>(null);
  const [draft, setDraft] = useState<ReviewDraft | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  // Tags made on the card, until the list of tags catches up with them.
  const [createdTags, setCreatedTags] = useState<Tag.Dto[]>([]);

  const categories = model.categories.data?.items ?? [];
  const tags = model.tags.data?.items ?? [];
  const accounts = model.accounts.data?.items ?? [];
  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const items = model.queue.data?.items ?? [];
  const reviewedIds = new Set(reviewed.map((entry) => entry.item.transaction.id));
  const ordered = orderQueue({ items, reviewedIds, skippedIds, promotedId });
  const reopened = cursor === null ? null : (reviewed[cursor] ?? null);
  const currentItem = reopened?.item ?? ordered[0] ?? null;
  const transaction = currentItem?.transaction ?? null;
  const kind = transaction ? getTransactionDirection(transaction.amountCents) : 'expense';

  // What the card starts with; the draft only exists once the person changes something.
  const suggestedCategoryId =
    currentItem?.categorySuggestions.find((suggestion) => categoryById.has(suggestion.categoryId))
      ?.categoryId ?? null;
  const initialCategoryId = reopened ? reopened.categoryId : suggestedCategoryId;
  const initialDraft: ReviewDraft | null =
    currentItem && transaction
      ? {
          transactionId: transaction.id,
          categoryId: initialCategoryId,
          // The tags belong to the category: the ones the transaction has only count while its own
          // category is the one on the card.
          tagIds: reopened
            ? reopened.tagIds
            : transaction.categoryId === initialCategoryId
              ? transaction.tagIds
              : [],
          ruleEnabled: true,
        }
      : null;
  const activeDraft = draft && draft.transactionId === transaction?.id ? draft : initialDraft;

  function changeDraft(patch: Partial<ReviewDraft>) {
    if (!activeDraft) return;
    // Another category leaves the tags of the old one behind.
    const movesCategory =
      patch.categoryId !== undefined && patch.categoryId !== activeDraft.categoryId;
    setDraft({ ...activeDraft, ...(movesCategory ? { tagIds: [] } : {}), ...patch });
  }

  const pattern = currentItem?.rulePattern ?? '';
  const selectedId = activeDraft?.categoryId ?? null;
  const ruleOffered =
    reopened === null && selectedId !== null && pattern.length >= MIN_PATTERN_LENGTH;
  const { preview, suggestions } = useReviewRuleModel({
    rulePreview: ruleOffered && selectedId ? { pattern, kind, categoryId: selectedId } : null,
    reviewedIds: [...reviewedIds],
  });

  function choiceFor(categoryId: string): ReviewChoice | null {
    const category = categoryById.get(categoryId);
    return category
      ? { id: category.id, label: category.name, icon: mapCategoryIcon(category.icon) }
      : null;
  }

  const suggestionChoices = (currentItem?.categorySuggestions ?? []).flatMap(
    (suggestion) => choiceFor(suggestion.categoryId) ?? [],
  );
  const pickedElsewhere =
    selectedId && !suggestionChoices.some((choice) => choice.id === selectedId)
      ? choiceFor(selectedId)
      : null;
  const cardChoices = pickedElsewhere ? [...suggestionChoices, pickedElsewhere] : suggestionChoices;
  const selectedIcon = cardChoices.find((choice) => choice.id === selectedId)?.icon;

  // The category that is a transfer ("Rotação entre contas") fits both legs of a rotation.
  const pickerCategories: CategoryOption[] = categories
    .filter((category) => category.kind === kind || category.isTransfer)
    .map((category) => ({
      id: category.id,
      name: category.name,
      icon: mapCategoryIcon(category.icon),
    }));

  // Progress: what was saved in this visit against what is left. The server may still list a
  // transaction saved a moment ago, so those do not count as left.
  const staleCount = items.filter((item) => reviewedIds.has(item.transaction.id)).length;
  const remaining = Math.max(0, (model.queue.data?.total ?? 0) - staleCount);
  const done = reviewed.length;

  const upcoming = reopened ? ordered : ordered.slice(1);
  const listed = upcoming.slice(0, LISTED_IN_QUEUE);
  const hiddenCount = Math.max(0, remaining - (reopened ? 0 : 1) - listed.length);

  const undoSave = useUndoReviewEntry({
    onUndone: (entry) => {
      setReviewed((current) =>
        current.filter((saved) => saved.item.transaction.id !== entry.item.transaction.id),
      );
      setCursor(null);
    },
    onError: setActionError,
  });
  const saveEntry = useSaveReviewEntry({ onError: setActionError });

  async function save() {
    if (!currentItem || !transaction || !activeDraft?.categoryId) return;
    const categoryId = activeDraft.categoryId;
    setSaving(true);
    setActionError(null);

    const entry = await saveEntry({
      item: currentItem,
      categoryId,
      tagIds: activeDraft.tagIds,
      rule: ruleOffered && activeDraft.ruleEnabled ? { pattern, kind } : null,
    });
    if (!entry) {
      setSaving(false);
      return;
    }

    setSaving(false);
    setDraft(null);
    setPromotedId(null);

    if (cursor !== null) {
      setReviewed((current) => current.map((saved, index) => (index === cursor ? entry : saved)));
      setCursor(cursor + 1 >= reviewed.length ? null : cursor + 1);
      return;
    }

    setReviewed((current) => [...current, entry]);
    setSkippedIds((current) => current.filter((id) => id !== transaction.id));
    showUndoToast({
      message: `${transaction.description} salva em ${categoryById.get(categoryId)?.name ?? 'a categoria'}${entry.ruleId ? ', com regra' : ''}`,
      onUndo: () => void undoSave(entry),
      withIcon: true,
    });
  }
  function skip() {
    if (cursor !== null) {
      setCursor(cursor + 1 >= reviewed.length ? null : cursor + 1);
      return;
    }
    if (!transaction) return;
    setPromotedId(null);
    setSkippedIds((current) => [...current.filter((id) => id !== transaction.id), transaction.id]);
  }

  function goBack() {
    setActionError(null);
    setCursor((cursor ?? reviewed.length) - 1);
  }

  const linkPayment = useLinkReviewPayment({ onError: setActionError });

  const firstSuggestion = (suggestions.data?.items ?? []).find((item) =>
    categoryById.has(item.categoryId),
  );

  const ruleSuggestion = useReviewRuleSuggestion({ onError: setActionError });

  const accountName = (accountId: string) => accounts.find((item) => item.id === accountId)?.name;

  const draftCategory = activeDraft?.categoryId
    ? categoryById.get(activeDraft.categoryId)
    : undefined;
  const tagsOfDraftCategory = tags.filter((tag) => tag.categoryId === draftCategory?.id);
  const tagPicker: Omit<TagPickerProps, 'label' | 'className'> = {
    categoryName: draftCategory?.name ?? null,
    options: tagsOfDraftCategory
      .filter((tag) => tag.archivedAt === null)
      .map((tag) => ({ id: tag.id, name: tag.name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' })),
    selected: (activeDraft?.tagIds ?? []).flatMap((id) => {
      const tag =
        tagsOfDraftCategory.find((item) => item.id === id) ??
        createdTags.find((item) => item.id === id);
      return tag ? [{ id: tag.id, name: tag.name }] : [];
    }),
    onChange: (tagIds) => changeDraft({ tagIds }),
    onCreate: async (name) => {
      if (!draftCategory) throw new Error('Escolha a categoria antes de criar uma tag.');
      try {
        const tag = await model.createTag.mutateAsync({ categoryId: draftCategory.id, name });
        setCreatedTags((current) => [...current, tag]);
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
    status:
      model.tags.isError && !model.tags.data ? 'error' : model.tags.isPending ? 'loading' : 'ready',
    onRetry: () => void model.tags.refetch(),
  };

  const card: ReviewQueueViewProps['card'] =
    currentItem && transaction && activeDraft
      ? {
          transaction: {
            name: transaction.description,
            detail: buildTransactionDetail(transaction, accountName(transaction.accountId)),
            amountCents: transaction.amountCents,
            kind,
            icon: selectedIcon ?? 'tag',
          },
          suggestions: cardChoices,
          selectedCategoryId: activeDraft.categoryId,
          onSelectCategory: (categoryId) => changeDraft({ categoryId }),
          onOtherCategory: () => setPickerOpen(true),
          tagPicker,
          rule: ruleOffered
            ? {
                keyword: pattern,
                matchCount: countRuleCatches(preview.data?.willChangeCount ?? 0),
                enabled: activeDraft.ruleEnabled,
                onEnabledChange: (enabled) => changeDraft({ ruleEnabled: enabled }),
              }
            : undefined,
          canGoBack: (cursor ?? reviewed.length) > 0,
          onBack: goBack,
          onSkip: skip,
          // With only this one left there is nothing to skip to.
          canSkip: remaining > 1,
          onSave: () => void save(),
          saving,
        }
      : null;

  const status: ReviewQueueViewProps['status'] = model.queue.isPending
    ? 'loading'
    : model.queue.isError && !model.queue.data
      ? 'error'
      : card
        ? 'ready'
        : 'empty';

  function queueIcon(suggestedCategoryId: string | undefined): IconName {
    const category = suggestedCategoryId ? categoryById.get(suggestedCategoryId) : undefined;
    return category ? mapCategoryIcon(category.icon) : 'tag';
  }

  return (
    <ReviewQueueView
      status={status}
      onRetry={() => void model.queue.refetch()}
      onBackToTransactions={() =>
        void navigate({ to: '/transactions', search: { month } as never })
      }
      progress={{ done, total: done + remaining }}
      card={card}
      actionError={actionError}
      queueItems={listed.map((item) => ({
        id: item.transaction.id,
        name: item.transaction.description,
        detail: buildTransactionDetail(item.transaction, accountName(item.transaction.accountId)),
        amountCents: item.transaction.amountCents,
        kind: getTransactionDirection(item.transaction.amountCents),
        icon: queueIcon(item.categorySuggestions[0]?.categoryId),
        ambiguity: buildAmbiguity(item),
      }))}
      hiddenCount={hiddenCount}
      onChooseCandidate={(itemId, optionId) => {
        setActionError(null);
        void linkPayment(itemId, optionId);
      }}
      onChooseOther={(itemId) => {
        setPromotedId(itemId);
        setCursor(null);
      }}
      ruleSuggestion={
        firstSuggestion
          ? {
              message: describeRuleSuggestion({
                count: firstSuggestion.recategorizedCount,
                pattern: firstSuggestion.pattern,
                categoryName: categoryById.get(firstSuggestion.categoryId)?.name,
              }),
              onCreate: () => {
                setActionError(null);
                void ruleSuggestion.accept(firstSuggestion);
              },
              onDismiss: () => ruleSuggestion.dismiss(firstSuggestion),
            }
          : null
      }
      categoryPicker={{
        isOpen: pickerOpen,
        onClose: () => setPickerOpen(false),
        categories: pickerCategories,
        value: selectedId,
        onSelect: (categoryId) => {
          changeDraft({ categoryId });
          setPickerOpen(false);
        },
      }}
    />
  );
}
