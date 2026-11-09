import { describe, expect, it } from 'vitest';

import type { RowContext } from '#/features/recurrences/recurrence-list/types/row-context.type.ts';
import { presentOccurrenceRow } from '#/features/recurrences/recurrence-list/utils/present-occurrence-row.util.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

const context: RowContext = {
  recurrences: new Map(),
  categoryIcons: new Map(),
  accountNames: new Map(),
  today: '2026-10-22',
  hidden: false,
  pendingKey: null,
};

function payment(overrides: { occurredOn?: string; description?: string } = {}) {
  return {
    id: 'p1',
    transactionId: 't1',
    amountCents: 4_490,
    occurredOn: '2026-10-07',
    description: 'NETFLIX.COM',
    linkedBy: 'auto' as const,
    ...overrides,
  };
}

describe('presentOccurrenceRow', () => {
  it('lists each linked transaction with its short day, description and amount', () => {
    const row = presentOccurrenceRow(
      createTestOccurrence({ status: 'confirmed', receivedCents: 4_490, payments: [payment()] }),
      context,
    );

    expect(row.transactions).toEqual([
      { id: 'p1', dateLabel: '07/10', description: 'NETFLIX.COM', amountCents: 4_490 },
    ]);
    expect(presentOccurrenceRow(createTestOccurrence(), context).transactions).toEqual([]);
  });

  it('writes the year of a payment that is from another year than today', () => {
    const row = presentOccurrenceRow(
      createTestOccurrence({
        status: 'late',
        carriedOver: true,
        payments: [payment({ occurredOn: '2025-12-30' })],
      }),
      context,
    );

    expect(row.transactions[0]?.dateLabel).toBe('30/12/2025');
    expect(row.carriedOver).toBe(true);
  });

  it('names a transaction with no description', () => {
    const row = presentOccurrenceRow(
      createTestOccurrence({ payments: [payment({ description: '  ' })] }),
      context,
    );

    expect(row.transactions[0]?.description).toBe('Sem descrição');
  });

  it('keeps the amount of the day list apart from the one of the card', () => {
    const late = createTestOccurrence({
      status: 'late',
      receivedCents: 4_000,
      remainingCents: 6_990,
    });
    const row = presentOccurrenceRow(late, context);

    expect(row.amountCents).toBe(4_000);
    expect(row.remainingCents).toBe(6_990);
    expect(row.agendaAmountCents).toBe(10_990);
  });
});
