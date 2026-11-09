import { describe, expect, it } from 'vitest';

import { Invoice } from '#/modules/invoices/domain/invoice/invoice.entity.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const NOW = '2026-11-06T12:00:00.000Z';
const LATER = '2026-11-09T15:00:00.000Z';

const invoice = (overrides: Partial<Invoice.Attributes> = {}) =>
  new Invoice({
    accountId: 'card-1',
    month: Month.of('2026-10'),
    closesOn: BusinessDate.of('2026-10-30'),
    dueOn: BusinessDate.of('2026-11-06'),
    bankTotal: null,
    totalOverride: null,
    overrideNote: null,
    payments: [],
    dismissedTransactionIds: [],
    createdAt: NOW,
    ...overrides,
  });

describe('Invoice.registerBankTotal', () => {
  it('records the total the bank gave and answers that it changed', () => {
    const closed = invoice();

    expect(closed.registerBankTotal(Money.fromCents(128490), LATER)).toBe(true);

    expect(closed.bankTotal?.cents).toBe(128490);
    expect(closed.updatedAt).toBe(LATER);
  });

  it('the same total again changes nothing (idempotent)', () => {
    const closed = invoice({ bankTotal: Money.fromCents(128490) });

    expect(closed.registerBankTotal(Money.fromCents(128490), LATER)).toBe(false);

    expect(closed.updatedAt).toBe(NOW);
  });

  it('a new total replaces the old one', () => {
    const closed = invoice({ bankTotal: Money.fromCents(100) });

    expect(closed.registerBankTotal(Money.fromCents(200), LATER)).toBe(true);
    expect(closed.bankTotal?.cents).toBe(200);
  });

  it('never touches the correction of Lucas', () => {
    const corrected = invoice({ totalOverride: Money.fromCents(5000), overrideNote: 'estorno' });

    corrected.registerBankTotal(Money.fromCents(128490), LATER);

    expect(corrected.totalOverride?.cents).toBe(5000);
    expect(corrected.overrideNote).toBe('estorno');
  });

  it('accepts a bank total of zero', () => {
    const closed = invoice({ bankTotal: Money.fromCents(100) });

    expect(closed.registerBankTotal(Money.zero(), LATER)).toBe(true);
    expect(closed.bankTotal?.cents).toBe(0);
  });
});
