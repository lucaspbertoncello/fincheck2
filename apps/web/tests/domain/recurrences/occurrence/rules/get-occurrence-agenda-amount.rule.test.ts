import { describe, expect, it } from 'vitest';

import { getOccurrenceAgendaAmount } from '#/domain/recurrences/occurrence/rules/get-occurrence-agenda-amount.rule.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

describe('getOccurrenceAgendaAmount', () => {
  it('shows what came in for a partial and a confirmed one', () => {
    expect(
      getOccurrenceAgendaAmount(
        createTestOccurrence({
          status: 'partial',
          receivedCents: 4_000,
          expectedAmountCents: 8_000,
        }),
      ),
    ).toBe(4_000);
    expect(
      getOccurrenceAgendaAmount(
        createTestOccurrence({ status: 'confirmed', receivedCents: 12_990 }),
      ),
    ).toBe(12_990);
  });

  it('shows the expected amount otherwise, a late one with a payment included', () => {
    expect(getOccurrenceAgendaAmount(createTestOccurrence())).toBe(10_990);
    expect(
      getOccurrenceAgendaAmount(
        createTestOccurrence({ status: 'late', receivedCents: 4_000, remainingCents: 6_990 }),
      ),
    ).toBe(10_990);
    expect(getOccurrenceAgendaAmount(createTestOccurrence({ status: 'confirmed' }))).toBe(10_990);
  });
});
