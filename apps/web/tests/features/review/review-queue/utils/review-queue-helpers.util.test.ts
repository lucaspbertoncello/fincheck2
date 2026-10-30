import type { ReviewQueue } from '@fincheck/shared/transactions/review-queue/review-queue.type.ts';
import { describe, expect, it } from 'vitest';

import { buildAmbiguity } from '#/features/review/review-queue/utils/build-ambiguity.util.ts';
import { buildTransactionDetail } from '#/features/review/review-queue/utils/build-transaction-detail.util.ts';
import { countRuleCatches } from '#/domain/transactions/review-queue/rules/count-rule-catches.rule.ts';

function itemWith(
  amountCents: number,
  candidates: [string, number, number][],
): ReviewQueue.ItemDto {
  return {
    transaction: { amountCents },
    recurrenceCandidates: candidates.map(([name, expected, remaining], index) => ({
      occurrenceId: `occ-${index}`,
      recurrenceId: `rec-${index}`,
      recurrenceName: name,
      month: '2026-10',
      expectedAmountCents: expected,
      remainingCents: remaining,
    })),
  } as ReviewQueue.ItemDto;
}

describe('buildAmbiguity', () => {
  it('has none without candidates', () => {
    expect(buildAmbiguity(itemWith(60000, []))).toBeUndefined();
  });

  it('asks which one, saying the value fits none', () => {
    const ambiguity = buildAmbiguity(
      itemWith(60000, [
        ['Mesada', 85000, 85000],
        ['VR', 90000, 90000],
      ]),
    );

    expect(ambiguity?.message).toBe('Mesada ou VR? O valor não bate com nenhum');
    expect(ambiguity?.options.map((option) => option.id)).toEqual(['occ-0', 'occ-1']);
    expect(ambiguity?.otherLabel).toBe('Outra receita');
  });

  it('does not say the value fits none when it fits one', () => {
    const ambiguity = buildAmbiguity(
      itemWith(85000, [
        ['Mesada', 85000, 85000],
        ['VR', 90000, 90000],
      ]),
    );

    expect(ambiguity?.message).toBe('Mesada ou VR?');
  });
});

describe('countRuleCatches', () => {
  it('takes the transaction under review out of the count', () => {
    expect(countRuleCatches(4)).toBe(3);
  });

  it('never goes below zero', () => {
    expect(countRuleCatches(0)).toBe(0);
  });
});

describe('buildTransactionDetail', () => {
  it('joins account, method and day', () => {
    expect(buildTransactionDetail({ method: 'credit', occurredOn: '2026-10-19' }, 'Bradesco')).toBe(
      'Bradesco, crédito, 19/10',
    );
  });

  it('skips the account while it is unknown', () => {
    expect(buildTransactionDetail({ method: 'pix', occurredOn: '2026-10-21' }, undefined)).toBe(
      'Pix, 21/10',
    );
  });
});
