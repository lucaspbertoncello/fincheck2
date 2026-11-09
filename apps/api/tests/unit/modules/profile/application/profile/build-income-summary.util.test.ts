import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';
import { describe, expect, it } from 'vitest';

import { buildIncomeSummary } from '#/modules/profile/application/profile/build-income-summary.util.ts';

function source(overrides: Partial<Profile.IncomeSource>): Profile.IncomeSource {
  return {
    recurrenceId: '0192f0a0-0000-7000-8000-000000000001',
    name: 'Salário',
    counterparty: null,
    employmentRegime: null,
    expectedAmountCents: 100000,
    amountMode: 'fixed',
    dateRule: {
      type: 'fixed_day',
      day: 5,
      businessDayNumber: null,
      toleranceDays: null,
      nonBusinessDayShift: 'none',
    },
    accountId: null,
    nextExpectedOn: '2026-12-05',
    ...overrides,
  };
}

describe('buildIncomeSummary (BR-PRF-002)', () => {
  it('is zero with no source', () => {
    expect(buildIncomeSummary([])).toEqual({ monthlyExpectedCents: 0, sources: [] });
  });

  it('sums the expected amounts', () => {
    const summary = buildIncomeSummary([
      source({ recurrenceId: 'a', expectedAmountCents: 420000 }),
      source({ recurrenceId: 'b', expectedAmountCents: 85000 }),
    ]);

    expect(summary.monthlyExpectedCents).toBe(505000);
  });

  it('puts the biggest amount first, then the name without accent or case, then the id', () => {
    const summary = buildIncomeSummary([
      source({ recurrenceId: 'd', name: 'Mesada', expectedAmountCents: 85000 }),
      source({ recurrenceId: 'c', name: 'Álvaro', expectedAmountCents: 85000 }),
      source({ recurrenceId: 'b', name: 'alvaro', expectedAmountCents: 85000 }),
      source({ recurrenceId: 'a', name: 'Salário', expectedAmountCents: 420000 }),
    ]);

    expect(summary.sources.map((item) => item.recurrenceId)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('does not change the list it receives', () => {
    const sources = [
      source({ recurrenceId: 'a', expectedAmountCents: 1 }),
      source({ recurrenceId: 'b', expectedAmountCents: 2 }),
    ];
    buildIncomeSummary(sources);

    expect(sources.map((item) => item.recurrenceId)).toEqual(['a', 'b']);
  });
});
