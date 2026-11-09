import type { Profile } from '@fincheck/shared/profile/profile/profile.type.ts';

// The income of the profile (BR-PRF-002): the monthly expected is the sum of the expected amount
// of the sources (a recurrence with two payments counts its full amount once), and the sources go
// biggest amount first, then by name without accent or case. Pure.
export function buildIncomeSummary(sources: Profile.IncomeSource[]): Profile.Dto['income'] {
  return {
    monthlyExpectedCents: sources.reduce((sum, source) => sum + source.expectedAmountCents, 0),
    sources: sources.toSorted(
      (a, b) =>
        b.expectedAmountCents - a.expectedAmountCents ||
        a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }) ||
        a.recurrenceId.localeCompare(b.recurrenceId),
    ),
  };
}
