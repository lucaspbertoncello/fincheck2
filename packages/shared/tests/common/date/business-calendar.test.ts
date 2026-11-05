import { describe, expect, it } from 'vitest';

import { easterSunday } from '#/common/date/easter-sunday.util.ts';
import { isBusinessDay } from '#/common/date/is-business-day.util.ts';
import { isNationalHoliday } from '#/common/date/is-national-holiday.util.ts';
import { nationalHolidays } from '#/common/date/national-holidays.util.ts';
import { shiftToBusinessDay } from '#/common/date/shift-to-business-day.util.ts';

describe('easterSunday', () => {
  it('gives the real Easter of each year', () => {
    expect(easterSunday(2024)).toBe('2024-03-31');
    expect(easterSunday(2026)).toBe('2026-04-05');
    expect(easterSunday(2027)).toBe('2027-03-28');
    expect(easterSunday(2029)).toBe('2029-04-01');
  });
});

describe('nationalHolidays', () => {
  it('lists the 2026 holidays, fixed and moving, sorted', () => {
    expect(nationalHolidays(2026)).toEqual([
      '2026-01-01',
      '2026-02-16', // Carnival Monday
      '2026-02-17', // Carnival Tuesday
      '2026-04-03', // Good Friday
      '2026-04-21',
      '2026-05-01',
      '2026-06-04', // Corpus Christi
      '2026-09-07',
      '2026-10-12',
      '2026-11-02',
      '2026-11-15',
      '2026-11-20',
      '2026-12-25',
    ]);
  });

  it('follows Easter in 2027', () => {
    const holidays = nationalHolidays(2027);

    expect(holidays).toContain('2027-02-08');
    expect(holidays).toContain('2027-03-26');
    expect(holidays).toContain('2027-05-27');
  });

  it('has Consciência Negra only from 2024', () => {
    expect(isNationalHoliday('2023-11-20')).toBe(false);
    expect(isNationalHoliday('2024-11-20')).toBe(true);
  });
});

describe('isBusinessDay', () => {
  it('is false on weekends and holidays, true otherwise', () => {
    expect(isBusinessDay('2027-01-10')).toBe(false); // Sunday
    expect(isBusinessDay('2027-01-09')).toBe(false); // Saturday
    expect(isBusinessDay('2026-10-12')).toBe(false); // Monday, holiday
    expect(isBusinessDay('2026-10-13')).toBe(true);
    expect(isBusinessDay('2026-04-03')).toBe(false); // Good Friday
  });
});

describe('shiftToBusinessDay', () => {
  it('keeps a business day where it is', () => {
    expect(shiftToBusinessDay('2027-01-11', 'after')).toBe('2027-01-11');
    expect(shiftToBusinessDay('2027-01-11', 'before')).toBe('2027-01-11');
  });

  it('moves Sunday 10/01/2027 to the next and the previous business day', () => {
    expect(shiftToBusinessDay('2027-01-10', 'after')).toBe('2027-01-11');
    expect(shiftToBusinessDay('2027-01-10', 'before')).toBe('2027-01-08');
  });

  it('moves a holiday on Monday: 12/10/2026', () => {
    expect(shiftToBusinessDay('2026-10-12', 'after')).toBe('2026-10-13');
    expect(shiftToBusinessDay('2026-10-12', 'before')).toBe('2026-10-09');
  });

  it('moves a holiday glued to the weekend: Tiradentes on Saturday 21/04/2029', () => {
    expect(shiftToBusinessDay('2029-04-21', 'after')).toBe('2029-04-23');
    expect(shiftToBusinessDay('2029-04-21', 'before')).toBe('2029-04-20');
  });

  it('goes around Good Friday 2027', () => {
    expect(shiftToBusinessDay('2027-03-26', 'before')).toBe('2027-03-25');
    expect(shiftToBusinessDay('2027-03-26', 'after')).toBe('2027-03-29');
  });

  it('crosses month and year: 31/12/2028 is a Sunday, 01/01/2029 is a holiday', () => {
    expect(shiftToBusinessDay('2028-12-31', 'after')).toBe('2029-01-02');
    expect(shiftToBusinessDay('2028-12-31', 'before')).toBe('2028-12-29');
    expect(shiftToBusinessDay('2026-05-01', 'before')).toBe('2026-04-30');
    expect(shiftToBusinessDay('2026-08-01', 'after')).toBe('2026-08-03');
    expect(shiftToBusinessDay('2027-05-01', 'after')).toBe('2027-05-03');
  });
});
