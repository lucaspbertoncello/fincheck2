import { describe, expect, it } from 'vitest';

import { computeCompetenceOn } from '#/modules/transactions/domain/transaction/compute-competence-on.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

const competence = (
  occurredOn: string,
  invoiceMonth: string | null,
  planPurchaseOn: string | null,
) =>
  computeCompetenceOn({
    occurredOn: BusinessDate.of(occurredOn),
    invoiceMonth: invoiceMonth === null ? null : Month.of(invoiceMonth),
    planPurchaseOn: planPurchaseOn === null ? null : BusinessDate.of(planPurchaseOn),
  }).value;

describe('computeCompetenceOn', () => {
  it('is the date it happened when there is no plan', () => {
    expect(competence('2026-11-05', null, null)).toBe('2026-11-05');
    expect(competence('2026-11-05', '2026-12', null)).toBe('2026-11-05');
  });

  it('is the day of the purchase in the month of the invoice, for a parcel', () => {
    expect(competence('2026-10-12', '2026-12', '2026-10-12')).toBe('2026-12-12');
    expect(competence('2026-12-12', '2026-12', '2026-10-12')).toBe('2026-12-12');
  });

  it('ignores the date the bank sent for a parcel', () => {
    expect(competence('2026-12-01', '2026-12', '2026-10-12')).toBe('2026-12-12');
    expect(competence('2026-09-30', '2026-12', '2026-10-12')).toBe('2026-12-12');
  });

  it('holds the day at the end of a month that is shorter', () => {
    expect(competence('2026-10-31', '2026-11', '2026-10-31')).toBe('2026-11-30');
    expect(competence('2026-10-31', '2027-02', '2026-10-31')).toBe('2027-02-28');
    expect(competence('2027-10-31', '2028-02', '2027-10-31')).toBe('2028-02-29');
    expect(competence('2026-10-30', '2027-02', '2026-10-30')).toBe('2027-02-28');
    expect(competence('2026-10-29', '2028-02', '2026-10-29')).toBe('2028-02-29');
  });

  it('crosses the year', () => {
    expect(competence('2026-12-20', '2027-01', '2026-12-20')).toBe('2027-01-20');
  });
});
