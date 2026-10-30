import { describe, expect, it } from 'vitest';

import type { OccurrenceRowData } from '#/features/recurrences/recurrence-list/types/recurrence-list.type.ts';
import { buildOccurrenceChips } from '#/features/recurrences/recurrence-list/utils/build-occurrence-chips.util.ts';
import { buildOccurrenceDays } from '#/features/recurrences/recurrence-list/utils/build-occurrence-days.util.ts';
import { getOccurrencePlacement } from '#/features/recurrences/recurrence-list/utils/get-occurrence-placement.util.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

const row = { occurrenceId: 'occurrence-1' } as OccurrenceRowData;

describe('getOccurrencePlacement', () => {
  it('puts what happened on the day of the last payment', () => {
    const confirmed = createTestOccurrence({
      status: 'confirmed',
      payments: [
        { id: 'p', transactionId: 't', amountCents: 1, occurredOn: '2026-10-21', linkedBy: 'auto' },
      ],
    });

    expect(getOccurrencePlacement(confirmed)).toEqual({ date: '2026-10-21', marker: 'happened' });
  });

  it('puts the rest on the expected day and leaves dismissed ones out', () => {
    expect(
      getOccurrencePlacement(createTestOccurrence({ status: 'late', expectedOn: '2026-10-20' })),
    ).toEqual({ date: '2026-10-20', marker: 'late' });
    expect(getOccurrencePlacement(createTestOccurrence({ status: 'skipped' }))).toBeNull();
    expect(getOccurrencePlacement(createTestOccurrence({ expectedOn: null }))?.date).toBeNull();
  });
});

describe('buildOccurrenceDays', () => {
  it('lists every day of the month with its markers and rows', () => {
    const days = buildOccurrenceDays('2026-10', [
      { occurrence: createTestOccurrence({ expectedOn: '2026-10-25' }), row },
      {
        occurrence: createTestOccurrence({
          id: 'o2',
          kind: 'income',
          status: 'partial',
          expectedOn: '2026-10-25',
        }),
        row,
      },
      { occurrence: createTestOccurrence({ id: 'o3', expectedOn: null }), row },
    ]);

    expect(days).toHaveLength(31);
    const day = days.find((item) => item.date === '2026-10-25');
    expect(day?.markers).toEqual([
      { flow: 'expense', status: 'expected' },
      { flow: 'income', status: 'partial' },
    ]);
    expect(day?.items).toHaveLength(2);
  });

  it('ignores occurrences of another month', () => {
    const days = buildOccurrenceDays('2026-10', [
      { occurrence: createTestOccurrence({ month: '2026-09', expectedOn: '2026-09-20' }), row },
    ]);

    expect(days.every((day) => day.items.length === 0)).toBe(true);
  });
});

describe('buildOccurrenceChips', () => {
  it('lists the late ones from earlier months and the ones without a day', () => {
    const chips = buildOccurrenceChips('2026-10', [
      createTestOccurrence({
        id: 'late',
        recurrenceName: 'Diarista',
        month: '2026-09',
        status: 'late',
        carriedOver: true,
        expectedOn: '2026-09-20',
      }),
      createTestOccurrence({
        id: 'free',
        recurrenceName: 'Mesada',
        kind: 'income',
        expectedOn: null,
      }),
      createTestOccurrence({ id: 'done', status: 'confirmed', expectedOn: null }),
    ]);

    expect(chips).toEqual([
      { key: 'late', label: 'Diarista atrasada, venceu 20/09', tone: 'warn' },
      { key: 'free', label: 'Mesada, sem data', tone: 'neutral' },
    ]);
  });
});
