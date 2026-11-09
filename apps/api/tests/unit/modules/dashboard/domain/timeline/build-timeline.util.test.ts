import { describe, expect, it } from 'vitest';

import { buildTimeline } from '#/modules/dashboard/domain/timeline/build-timeline.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { buildTestAgendaEntry } from '#tests/support/dashboard/agenda/build-test-agenda-entry.util.ts';

const today = BusinessDate.of('2026-10-22');
const october = Month.of('2026-10');

const occurrence = (overrides: Parameters<typeof buildTestAgendaEntry>[0]) =>
  buildTestAgendaEntry({
    source: {
      type: 'occurrence',
      billId: null,
      occurrenceId: 'o',
      recurrenceId: 'r',
      accountId: null,
      month: null,
    },
    badge: 'recurring',
    ...overrides,
  });

const build = (
  entries: ReturnType<typeof buildTestAgendaEntry>[],
  scope: 'all' | 'recurrences' = 'all',
  month = october,
) => buildTimeline({ month, today, scope, entries });

const dayOf = (result: ReturnType<typeof build>, date: string) =>
  result.days.find((item) => item.date === date);

describe('buildTimeline', () => {
  it('has every day of the month, with today and the past marked', () => {
    const { days } = build([]);

    expect(days).toHaveLength(31);
    expect(dayOf({ days } as never, '2026-10-21')).toMatchObject({ isPast: true, isToday: false });
    expect(days.find((item) => item.isToday)?.date).toBe('2026-10-22');
    expect(dayOf({ days } as never, '2026-10-23')).toMatchObject({ isPast: false });
  });

  it('has 29 days in a leap February and every day of a past month in the past', () => {
    expect(build([], 'all', Month.of('2028-02')).days).toHaveLength(29);
    expect(build([], 'all', Month.of('2026-09')).days.every((item) => item.isPast)).toBe(true);
    expect(build([], 'all', Month.of('2026-11')).days.some((item) => item.isPast)).toBe(false);
  });

  it('puts what is to come on its day, with what is left as the amount', () => {
    const result = build([
      buildTestAgendaEntry({
        key: 'a',
        dueOn: '2026-10-25',
        remainingCents: 4000,
        paidCents: 6000,
        state: 'partial',
      }),
    ]);

    expect(dayOf(result, '2026-10-25')?.items).toEqual([
      expect.objectContaining({
        key: 'a',
        amountCents: 4000,
        state: 'partial',
        date: '2026-10-25',
      }),
    ]);
  });

  it('puts the late ones, and the ones whose day passed, in the "atrasados" chips, and the ones with no day in "sem data"', () => {
    const result = build([
      buildTestAgendaEntry({ key: 'late', dueOn: '2026-10-05', state: 'overdue' }),
      buildTestAgendaEntry({ key: 'passed', dueOn: '2026-10-20', state: 'upcoming' }),
      buildTestAgendaEntry({ key: 'old', dueOn: '2026-08-10', state: 'overdue' }),
      occurrence({ key: 'undated', dueOn: null, flow: 'in' }),
    ]);

    expect(result.overdue.map((item) => [item.key, item.state])).toEqual([
      ['old', 'late'],
      ['late', 'late'],
      ['passed', 'expected'],
    ]);
    expect(result.undated.map((item) => item.key)).toEqual(['undated']);
    expect(result.days.every((item) => item.items.length === 0)).toBe(true);
  });

  it('puts what happened in the month on the day it happened, with what was received', () => {
    const result = build([
      occurrence({
        key: 'maxxy',
        flow: 'in',
        state: 'settled',
        settledOn: '2026-10-15',
        paidCents: 140000,
        amountCents: 140000,
        remainingCents: 0,
      }),
      buildTestAgendaEntry({ key: 'old', state: 'settled', settledOn: '2026-09-30' }),
    ]);

    expect(dayOf(result, '2026-10-15')?.items).toEqual([
      expect.objectContaining({ key: 'maxxy', state: 'happened', amountCents: 140000 }),
    ]);
    expect(result.days.flatMap((item) => item.items)).toHaveLength(1);
  });

  it('puts an invoice that falls due after the month on the last day, where the projection puts it', () => {
    const result = build([
      buildTestAgendaEntry({
        key: 'invoice:a:2026-10',
        dueOn: '2026-11-06',
        remainingCents: 161689,
      }),
      // Not counting in the Livre: it does not land anywhere.
      buildTestAgendaEntry({ key: 'bill:far', dueOn: '2026-11-20', countsInFreeBalance: false }),
    ]);

    expect(dayOf(result, '2026-10-31')?.items.map((item) => item.key)).toEqual([
      'invoice:a:2026-10',
    ]);
    expect(result.days.flatMap((item) => item.items)).toHaveLength(1);
  });

  it('leaves out what does not move the account on its day (a friend debt, a card expense) and what was paid off', () => {
    const result = build([
      buildTestAgendaEntry({ key: 'friend', movesCash: false, flow: 'in' }),
      occurrence({ key: 'card', movesCash: false, flow: 'out' }),
      buildTestAgendaEntry({ key: 'zero', remainingCents: 0 }),
    ]);

    expect(result.days.flatMap((item) => item.items)).toEqual([]);
    expect(result.overdue).toEqual([]);
  });

  describe('scope recurrences (the strip of Recorrentes)', () => {
    it('has only the occurrences, each on its expected day with its state, late and past ones included', () => {
      const result = build(
        [
          buildTestAgendaEntry({ key: 'bill' }),
          occurrence({ key: 'late', dueOn: '2026-10-05', state: 'overdue' }),
          occurrence({ key: 'next', dueOn: '2026-10-28' }),
          occurrence({ key: 'card', dueOn: '2026-10-28', movesCash: false }),
          occurrence({
            key: 'done',
            dueOn: '2026-10-10',
            state: 'settled',
            settledOn: '2026-10-12',
            paidCents: 10990,
            remainingCents: 0,
          }),
        ],
        'recurrences',
      );

      expect(dayOf(result, '2026-10-05')?.items).toEqual([
        expect.objectContaining({ key: 'late', state: 'late' }),
      ]);
      expect(dayOf(result, '2026-10-10')?.items).toEqual([
        expect.objectContaining({ key: 'done', state: 'happened' }),
      ]);
      expect(dayOf(result, '2026-10-28')?.items.map((item) => item.key)).toEqual(['card', 'next']);
      expect(result.days.flatMap((item) => item.items)).toHaveLength(4);
      expect(result.overdue).toEqual([]);
    });

    it('sends only the ones that came along from an earlier month to the "atrasados" chips', () => {
      const result = build(
        [occurrence({ key: 'carried', dueOn: '2026-09-25', state: 'overdue', carriedOver: true })],
        'recurrences',
      );

      expect(result.overdue.map((item) => item.key)).toEqual(['carried']);
    });
  });

  describe('another month', () => {
    it('shows what falls due in a future month as expected, and drops what is not of it', () => {
      const result = build(
        [
          buildTestAgendaEntry({ key: 'in', dueOn: '2026-11-10', countsInFreeBalance: false }),
          buildTestAgendaEntry({ key: 'out', dueOn: '2026-12-10', countsInFreeBalance: false }),
        ],
        'all',
        Month.of('2026-11'),
      );

      expect(dayOf(result, '2026-11-10')?.items.map((item) => item.key)).toEqual(['in']);
      expect(result.days.flatMap((item) => item.items)).toHaveLength(1);
    });

    it('shows what is still open from a past month as late, only when it is of that month', () => {
      const result = build(
        [
          buildTestAgendaEntry({ key: 'sept', dueOn: '2026-09-10', state: 'overdue' }),
          buildTestAgendaEntry({ key: 'aug', dueOn: '2026-08-10', state: 'overdue' }),
        ],
        'all',
        Month.of('2026-09'),
      );

      expect(result.overdue.map((item) => item.key)).toEqual(['sept']);
    });
  });
});
