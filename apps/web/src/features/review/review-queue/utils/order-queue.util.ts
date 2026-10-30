import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';

type OrderQueueInput = {
  items: readonly ReviewQueue.ItemDto[];
  /** Saved in this visit: the server may still list them for a moment. */
  reviewedIds: ReadonlySet<string>;
  /** Skipped, oldest skip first: they go to the end of the line. */
  skippedIds: readonly string[];
  /** "Outra receita" on a queued item: it jumps to the card. */
  promotedId: string | null;
};

/** The order the person goes through the queue: promoted, then the untouched, then the skipped. */
export function orderQueue({
  items,
  reviewedIds,
  skippedIds,
  promotedId,
}: OrderQueueInput): ReviewQueue.ItemDto[] {
  const open = items.filter((item) => !reviewedIds.has(item.transaction.id));
  const promoted = open.find((item) => item.transaction.id === promotedId);
  const rest = open.filter((item) => item !== promoted);
  const untouched = rest.filter((item) => !skippedIds.includes(item.transaction.id));
  const skipped = skippedIds.flatMap((id) => rest.filter((item) => item.transaction.id === id));

  return [...(promoted ? [promoted] : []), ...untouched, ...skipped];
}
