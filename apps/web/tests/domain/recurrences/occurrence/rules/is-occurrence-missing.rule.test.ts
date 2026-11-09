import { describe, expect, it } from 'vitest';

import { isOccurrenceMissing } from '#/domain/recurrences/occurrence/rules/is-occurrence-missing.rule.ts';
import { createTestOccurrence } from '#tests/support/recurrences/occurrence/create-test-occurrence.util.ts';

// The same notion as the "faltam" of the card: the API sums `remainingCents` of the month's
// occurrences, the dismissed ones out.
describe('isOccurrenceMissing', () => {
  it('is true for a pending, a partial and a late one, which all have money left', () => {
    expect(isOccurrenceMissing(createTestOccurrence({ status: 'expected' }))).toBe(true);
    expect(
      isOccurrenceMissing(
        createTestOccurrence({ status: 'partial', receivedCents: 4_000, remainingCents: 6_990 }),
      ),
    ).toBe(true);
    expect(isOccurrenceMissing(createTestOccurrence({ status: 'late' }))).toBe(true);
  });

  it('follows the money left: no remaining amount, nothing missing', () => {
    expect(
      isOccurrenceMissing(createTestOccurrence({ status: 'expected', remainingCents: 0 })),
    ).toBe(false);
  });

  it('is false for a confirmed one, even above the expected amount', () => {
    expect(
      isOccurrenceMissing(
        createTestOccurrence({ status: 'confirmed', receivedCents: 20_000, remainingCents: 0 }),
      ),
    ).toBe(false);
  });

  it('is false for a dismissed one, even with a payment that stayed linked and a remainder', () => {
    expect(
      isOccurrenceMissing(
        createTestOccurrence({ status: 'skipped', receivedCents: 4_000, remainingCents: 0 }),
      ),
    ).toBe(false);
    expect(isOccurrenceMissing(createTestOccurrence({ status: 'skipped' }))).toBe(false);
  });

  it('is false for a late one brought from an earlier month', () => {
    expect(isOccurrenceMissing(createTestOccurrence({ status: 'late', carriedOver: true }))).toBe(
      false,
    );
  });
});
