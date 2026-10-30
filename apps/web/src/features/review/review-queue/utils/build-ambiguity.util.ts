import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import type { ReviewQueueItemData } from '@fincheck/ui';

/**
 * "Mesada ou VR? O valor não bate com nenhum": the question of a Pix that more than one recurrence
 * could have paid. Without candidates the item is a plain one.
 */
export function buildAmbiguity(item: ReviewQueue.ItemDto): ReviewQueueItemData['ambiguity'] {
  const { recurrenceCandidates } = item;
  if (recurrenceCandidates.length === 0) return undefined;

  const amount = Math.abs(item.transaction.amountCents);
  const matchesOne = recurrenceCandidates.some(
    (candidate) => candidate.expectedAmountCents === amount || candidate.remainingCents === amount,
  );
  const names = recurrenceCandidates.map((candidate) => candidate.recurrenceName).join(' ou ');

  return {
    message: matchesOne ? `${names}?` : `${names}? O valor não bate com nenhum`,
    options: recurrenceCandidates.map((candidate) => ({
      id: candidate.occurrenceId,
      label: candidate.recurrenceName,
      icon: 'dollar',
    })),
    otherLabel: 'Outra receita',
  };
}
