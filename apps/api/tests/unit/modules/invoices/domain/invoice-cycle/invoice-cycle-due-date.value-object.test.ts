import { describe, expect, it } from 'vitest';

import { InvoiceCycle } from '#/modules/invoices/domain/invoice-cycle/invoice-cycle.value-object.ts';
import { BusinessCalendar } from '#/shared/calendar/business-calendar.service.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';

const calendar = new BusinessCalendar();
const monthDueOn = (cycle: InvoiceCycle, dueOn: string) =>
  cycle.monthDueOn(BusinessDate.of(dueOn), calendar)?.value ?? null;

describe('InvoiceCycle.monthDueOn: the invoice a due date of the bank belongs to', () => {
  it('closes on the 30th, due on the 6th: the invoice of October is due on 06/11', () => {
    expect(monthDueOn(new InvoiceCycle(30, 6), '2026-11-06')).toBe('2026-10');
  });

  it('closes on the 5th, due on the 12th: the due date is in the month of the closing', () => {
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-11-12')).toBe('2026-11');
  });

  it('a due date the bank moved to the next business day is the same invoice', () => {
    // 12/09/2026 is a Saturday: the cycle moves it to Monday 14/09; a bank that did not still fits.
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-09-12')).toBe('2026-09');
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-09-14')).toBe('2026-09');
  });

  it('crosses the end of the year', () => {
    expect(monthDueOn(new InvoiceCycle(30, 6), '2027-01-06')).toBe('2026-12');
  });

  it('a due date that fits no month of the cycle (a week away or more) is not guessed', () => {
    // Closing on the 5th, due on the 12th: a bill due on the 25th is of another cycle.
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-11-25')).toBeNull();
  });

  it('a due date a week away is still the invoice; 8 days is not', () => {
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-11-19')).toBe('2026-11');
    expect(monthDueOn(new InvoiceCycle(5, 12), '2026-11-20')).toBeNull();
  });
});
