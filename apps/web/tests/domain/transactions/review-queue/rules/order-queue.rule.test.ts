import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import { describe, expect, it } from 'vitest';

import { orderQueue } from '#/domain/transactions/review-queue/rules/order-queue.rule.ts';

function item(id: string): ReviewQueue.ItemDto {
  return { transaction: { id } } as ReviewQueue.ItemDto;
}

const items = [item('a'), item('b'), item('c'), item('d')];
const ids = (list: ReviewQueue.ItemDto[]) => list.map((entry) => entry.transaction.id);

describe('orderQueue', () => {
  it('keeps the server order when nothing happened', () => {
    expect(
      ids(orderQueue({ items, reviewedIds: new Set(), skippedIds: [], promotedId: null })),
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('leaves out what was saved in this visit', () => {
    expect(
      ids(orderQueue({ items, reviewedIds: new Set(['a']), skippedIds: [], promotedId: null })),
    ).toEqual(['b', 'c', 'd']);
  });

  it('sends skipped ones to the end, the oldest skip first', () => {
    expect(
      ids(orderQueue({ items, reviewedIds: new Set(), skippedIds: ['b', 'a'], promotedId: null })),
    ).toEqual(['c', 'd', 'b', 'a']);
  });

  it('puts the promoted one first, even when it was skipped', () => {
    expect(
      ids(orderQueue({ items, reviewedIds: new Set(), skippedIds: ['c'], promotedId: 'c' })),
    ).toEqual(['c', 'a', 'b', 'd']);
  });

  it('ignores ids that left the queue', () => {
    expect(
      ids(orderQueue({ items, reviewedIds: new Set(), skippedIds: ['gone'], promotedId: 'gone' })),
    ).toEqual(['a', 'b', 'c', 'd']);
  });
});
