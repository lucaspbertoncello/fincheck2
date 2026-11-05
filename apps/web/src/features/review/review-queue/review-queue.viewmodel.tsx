import { useToast, type CategoryOption, type IconName, type ReviewChoice } from '@fincheck/ui';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

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
import { getApiErrorMessage } from '#/shared/api/get-api-error-message.util.ts';
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

  async function resolveTagIds(names: readonly string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names) {
      const existing = tags.find((tag) => tag.name.toLowerCase() === name.toLowerCase());
      ids.push(existing ? existing.id : (await model.createTag.mutateAsync({ name })).id);
    }
    return ids;
  }

  async function undoSave(entry: ReviewedEntry) {
    try {
      if (entry.historyPrevious.length > 0) {
        await model.restoreBulk.mutateAsync({ items: entry.historyPrevious });
      }
      if (entry.ruleId) await model.deleteRule.mutateAsync(entry.ruleId);
      await model.updateTransaction.mutateAsync({
        id: entry.item.transaction.id,
        body: { categoryId: null, tagIds: entry.item.transaction.tagIds },
      });
      setReviewed((current) =>
        current.filter((saved) => saved.item.transaction.id !== entry.item.transaction.id),
      );
      setCursor(null);
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.'));
    }
  }

  async function save() {
    if (!currentItem || !transaction || !activeDraft?.categoryId) return;
    const categoryId = activeDraft.categoryId;
    setSaving(true);
    setActionError(null);

    try {
      const tagIds = await resolveTagIds(activeDraft.tags);
      await model.updateTransaction.mutateAsync({
        id: transaction.id,
        body: { categoryId, tagIds },
      });
    } catch (error) {
      setSaving(false);
      setActionError(getApiErrorMessage(error, 'Não deu para salvar. Tente de novo.'));
      return;
    }

    let entry: ReviewedEntry = {
      item: currentItem,
      categoryId,
      tags: activeDraft.tags,
      ruleId: null,
      historyPrevious: [],
    };

    if (ruleOffered && activeDraft.ruleEnabled) {
      try {
        const created = await model.createRule.mutateAsync({
          descriptionContains: pattern,
          kind,
          categoryId,
          applyToHistory: true,
        });
        entry = {
          ...entry,
          ruleId: created.rule.id,
          historyPrevious: created.applied?.previous ?? [],
        };
      } catch (error) {
        // The same rule already exists: the goal of the checkbox is met. Anything else is told.
        if (!hasApiErrorCode(error, 'RULE_DUPLICATE')) {
          setActionError(
            `A transação foi salva, mas a regra não: ${getApiErrorMessage(error, 'tente criá-la pela tela Regras.')}`,
          );
        }
      }
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

  async function chooseCandidate(transactionId: string, occurrenceId: string) {
    setActionError(null);
    try {
      const occurrence = await model.linkPayment.mutateAsync({
        id: occurrenceId,
        body: { transactionId },
      });
      const payment = occurrence.payments.find((item) => item.transactionId === transactionId);
      showUndoToast({
        message: `Pix ligado a ${occurrence.recurrenceName}`,
        onUndo: () => {
          if (!payment) return;
          model.unlinkPayment
            .mutateAsync({ id: occurrenceId, paymentId: payment.id })
            .catch((error: unknown) =>
              setActionError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.')),
            );
        },
        withIcon: true,
      });
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Não deu para ligar o Pix. Tente de novo.'));
    }
  }

  const firstSuggestion = (suggestions.data?.items ?? []).find((item) =>
    categoryById.has(item.categoryId),
  );

  async function acceptSuggestion() {
    if (!firstSuggestion) return;
    setActionError(null);
    try {
      const created = await model.acceptSuggestion.mutateAsync({
        pattern: firstSuggestion.pattern,
        categoryId: firstSuggestion.categoryId,
        applyToHistory: firstSuggestion.willChangeCount > 0,
      });
      const previous = created.applied?.previous ?? [];
      showUndoToast({
        message: `Regra criada para “${firstSuggestion.pattern}”`,
        onUndo: () => {
          void (async () => {
            try {
              if (previous.length > 0) await model.restoreBulk.mutateAsync({ items: previous });
              await model.deleteRule.mutateAsync(created.rule.id);
            } catch (error) {
              setActionError(getApiErrorMessage(error, 'Não deu para desfazer. Tente de novo.'));
            }
          })();
        },
        withIcon: true,
      });
    } catch (error) {
      setActionError(getApiErrorMessage(error, 'Não deu para criar a regra. Tente de novo.'));
    }
  }

  function dismissSuggestion() {
    if (!firstSuggestion) return;
    model.dismissSuggestion
      .mutateAsync({ pattern: firstSuggestion.pattern, categoryId: firstSuggestion.categoryId })
      .catch((error: unknown) =>
        setActionError(getApiErrorMessage(error, 'Não deu para dispensar. Tente de novo.')),
      );
  }

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
      onChooseCandidate={(itemId, optionId) => void chooseCandidate(itemId, optionId)}
      onChooseOther={(itemId) => {
        setPromotedId(itemId);
        setCursor(null);
      }}
      ruleSuggestion={
        firstSuggestion
          ? {
              message: `Você moveu ${firstSuggestion.recategorizedCount} transações “${firstSuggestion.pattern}” para ${categoryById.get(firstSuggestion.categoryId)?.name}. A regra faz isso sozinha daqui para a frente.`,
              onCreate: () => void acceptSuggestion(),
              onDismiss: dismissSuggestion,
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
