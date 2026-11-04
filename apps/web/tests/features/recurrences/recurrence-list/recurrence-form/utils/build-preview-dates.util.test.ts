import { describe, expect, it } from 'vitest';

import { buildPreviewDates } from '#/features/recurrences/recurrence-list/recurrence-form/utils/build-preview-dates.util.ts';

const occurrence = (month: string, expectedOn: string | null, start?: string, end?: string) => ({
  month,
  expectedOn,
  windowStartOn: start ?? expectedOn ?? `${month}-01`,
  windowEndOn: end ?? expectedOn ?? `${month}-28`,
});

describe('buildPreviewDates', () => {
  it('keeps three dates at most, with the weekday and the day', () => {
    const dates = buildPreviewDates(
      [
        occurrence('2026-11', '2026-11-20'),
        occurrence('2026-12', '2026-12-18'),
        occurrence('2027-01', '2027-01-20'),
        occurrence('2027-02', '2027-02-19'),
      ],
      'fixed_day',
    );

    expect(dates).toHaveLength(3);
    expect(dates[0]).toMatchObject({ weekday: 'sex', dayMonth: '20 nov', note: null });
    expect(dates[0]?.label).toBe('sexta-feira, 20 de novembro');
  });

  it('shows the window when the rule has a margin', () => {
    const [first, second] = buildPreviewDates(
      [
        occurrence('2026-11', '2026-11-10', '2026-11-07', '2026-11-13'),
        occurrence('2026-12', '2026-12-01', '2026-11-28', '2026-12-04'),
      ],
      'around_day',
    );

    expect(first?.note).toBe('± 3 dias');
    expect(first?.label).toBe(
      'terça-feira, 10 de novembro, pode chegar de 7 de novembro a 13 de novembro',
    );
    expect(second?.note).toBe('± 3 dias');
  });

  it('hides the window where it is not a margin around the day', () => {
    const [first] = buildPreviewDates(
      [occurrence('2026-11', '2026-11-07', '2026-11-01', '2026-11-10')],
      'business_day',
    );

    expect(first?.note).toBeNull();
    expect(first?.label).toBe('sábado, 7 de novembro');
  });

  it('says "qualquer dia" when the rule has no fixed day', () => {
    const [first] = buildPreviewDates([occurrence('2026-12', null)], 'any_day');

    expect(first).toMatchObject({ weekday: '', dayMonth: 'Dezembro', note: 'qualquer dia' });
    expect(first?.label).toBe('qualquer dia de dezembro');
  });
});
