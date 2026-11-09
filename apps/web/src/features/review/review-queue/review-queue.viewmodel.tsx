import { useToast, type CategoryOption, type IconName, type ReviewChoice } from '@fincheck/ui';
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
  const initialDraft: ReviewDraft | null =
    currentItem && transaction
      ? {
          transactionId: transaction.id,
          categoryId: reopened
            ? reopened.categoryId
            : (currentItem.categorySuggestions.find((suggestion) =>
                categoryById.has(suggestion.categoryId),
              )?.categoryId ?? null),
          tags: reopened
            ? reopened.tags
            : transaction.tagIds.flatMap((id) => tags.find((tag) => tag.id === id)?.name ?? []),
          ruleEnabled: true,
        }
      : null;
  const activeDraft = draft && draft.transactionId === transaction?.id ? draft : initialDraft;

  function changeDraft(patch: Partial<ReviewDraft>) {
    if (activeDraft) setDraft({ ...activeDraft, ...patch });
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

  const pickerCategories: CategoryOption[] = categories
    .filter((category) => category.kind === kind)
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
  const saveEntry = useSaveReviewEntry({ tags, onError: setActionError });

  async function save() {
    if (!currentItem || !transaction || !activeDraft?.categoryId) return;
    const categoryId = activeDraft.categoryId;
    setSaving(true);
    setActionError(null);

    const entry = await saveEntry({
      item: currentItem,
      categoryId,
      tagNames: activeDraft.tags,
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
          tags: activeDraft.tags,
          onTagsChange: (next) => changeDraft({ tags: next }),
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
