import type { MockState } from '#mocks/state/mock-state.type.ts';

// The categories whose tags a transaction may have: its own or, when it is split, the ones of its
// parts (PM, 09/11/2026). With none there is no tag.
export function getTaggableCategoryIds(
  tx: Pick<MockState.TransactionRecord, 'categoryId' | 'splits'>,
): string[] {
  if (tx.splits.length === 0) return tx.categoryId === null ? [] : [tx.categoryId];

  return [
    ...new Set(tx.splits.flatMap((part) => (part.categoryId === null ? [] : [part.categoryId]))),
  ];
}
