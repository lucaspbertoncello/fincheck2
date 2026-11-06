import { describe, expect, it } from 'vitest';

import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const calendar = new BusinessCalendar();
const day = (value: string) => BusinessDate.of(value);

describe('BusinessCalendar', () => {
  describe('isBusinessDay', () => {
    it('is not a business day on Saturday and Sunday', () => {
      expect(calendar.isBusinessDay(day('2026-11-07'))).toBe(false);
      expect(calendar.isBusinessDay(day('2026-11-08'))).toBe(false);
      expect(calendar.isBusinessDay(day('2026-11-09'))).toBe(true);
    });

    it.each([
      ['2026-01-01', 'Confraternização Universal'],
      ['2026-04-21', 'Tiradentes'],
      ['2026-05-01', 'Dia do Trabalho'],
      ['2026-09-07', 'Independência'],
      ['2026-10-12', 'Nossa Senhora Aparecida'],
      ['2026-11-02', 'Finados'],
      ['2026-11-15', 'Proclamação da República'],
      ['2026-12-25', 'Natal'],
    ])('treats %s (%s) as not a business day', (date) => {
      expect(calendar.isBusinessDay(day(date))).toBe(false);
    });

    it('treats the Consciência Negra of 20/11/2026 (a Friday) as not a business day', () => {
      expect(calendar.isBusinessDay(day('2026-11-20'))).toBe(false);
    });

    it('has the Consciência Negra only from 2024', () => {
      expect(calendar.isBusinessDay(day('2023-11-20'))).toBe(true);
      expect(calendar.isBusinessDay(day('2024-11-20'))).toBe(false);
    });

    it('takes the moving holidays of 2026 out (Easter on 05/04)', () => {
      expect(calendar.isBusinessDay(day('2026-02-16'))).toBe(false); // Carnival Monday
      expect(calendar.isBusinessDay(day('2026-02-17'))).toBe(false); // Carnival Tuesday
      expect(calendar.isBusinessDay(day('2026-04-03'))).toBe(false); // Good Friday
      expect(calendar.isBusinessDay(day('2026-06-04'))).toBe(false); // Corpus Christi
      expect(calendar.isBusinessDay(day('2026-02-18'))).toBe(true); // Ash Wednesday works
    });

    it('takes the moving holidays of 2027 out (Easter on 28/03)', () => {
      expect(calendar.isBusinessDay(day('2027-02-08'))).toBe(false); // Carnival Monday
      expect(calendar.isBusinessDay(day('2027-02-09'))).toBe(false); // Carnival Tuesday
      expect(calendar.isBusinessDay(day('2027-03-26'))).toBe(false); // Good Friday
      expect(calendar.isBusinessDay(day('2027-05-27'))).toBe(false); // Corpus Christi
    });
  });

  describe('nthBusinessDay', () => {
    it('is 09/11 for the 5th business day of November 2026 (Finados on 02/11)', () => {
      expect(calendar.nthBusinessDay(Month.of('2026-11'), 5).value).toBe('2026-11-09');
    });

    it('starts on the 1st when it is a business day', () => {
      expect(calendar.nthBusinessDay(Month.of('2026-10'), 1).value).toBe('2026-10-01');
    });

    it('skips the weekend (the 5th business day of October 2026 is 07/10)', () => {
      expect(calendar.nthBusinessDay(Month.of('2026-10'), 5).value).toBe('2026-10-07');
    });

    it('stops at the last business day of the month (November 2026 has 19)', () => {
      // 21 weekdays minus Finados (02/11) and Consciência Negra (20/11).
      expect(calendar.nthBusinessDay(Month.of('2026-11'), 19).value).toBe('2026-11-30');
      expect(() => calendar.nthBusinessDay(Month.of('2026-11'), 20)).toThrow(RangeError);
    });

    it('refuses n below one', () => {
      expect(() => calendar.nthBusinessDay(Month.of('2026-11'), 0)).toThrow(RangeError);
    });
  });

  describe('nextBusinessDay and previousBusinessDay', () => {
    it('keep a business day as it is', () => {
      expect(calendar.nextBusinessDay(day('2026-11-06')).value).toBe('2026-11-06');
      expect(calendar.previousBusinessDay(day('2026-11-06')).value).toBe('2026-11-06');
    });

    it('move a Saturday forward to Monday and back to Friday', () => {
      expect(calendar.nextBusinessDay(day('2026-11-07')).value).toBe('2026-11-09');
      expect(calendar.previousBusinessDay(day('2026-11-07')).value).toBe('2026-11-06');
    });

    it('jump over a holiday on a Monday (Finados, 02/11/2026)', () => {
      expect(calendar.nextBusinessDay(day('2026-11-01')).value).toBe('2026-11-03');
      expect(calendar.previousBusinessDay(day('2026-11-02')).value).toBe('2026-10-30');
    });

    it('cross the year (01/01/2027 is a holiday)', () => {
      expect(calendar.nextBusinessDay(day('2026-12-26')).value).toBe('2026-12-28');
      expect(calendar.nextBusinessDay(day('2027-01-01')).value).toBe('2027-01-04');
      expect(calendar.previousBusinessDay(day('2027-01-01')).value).toBe('2026-12-31');
    });

    it('push the due date of an invoice off 06/12/2026 (a Sunday) to Monday 07/12', () => {
      expect(calendar.nextBusinessDay(day('2026-12-06')).value).toBe('2026-12-07');
    });
  });
});
