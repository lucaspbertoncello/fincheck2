import type { Recurrence } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

/** How the person is paid, as the profile writes it. */
export const EMPLOYMENT_REGIME_LABEL: Record<
  NonNullable<Recurrence.Dto['employmentRegime']>,
  string
> = {
  clt: 'CLT',
  pj: 'PJ',
  other: 'Outro',
};
