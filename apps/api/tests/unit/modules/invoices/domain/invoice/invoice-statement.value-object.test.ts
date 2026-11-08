import { describe, expect, it } from 'vitest';

import { InvoiceStatement } from '#/modules/invoices/domain/invoice/invoice-statement.value-object.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const CLOSES_ON = '2026-10-30';
const DUE_ON = '2026-11-06';

const cents = (value: number) => Money.fromCents(value);

function compute(
  overrides: Partial<{
    phase: InvoiceStatement.Input['phase'];
    today: string;
    purchases: number;
    installments: number;
    expectedRecurring: number;
    bankTotal: number | null;
    totalOverride: number | null;
    paid: number;
  }> = {},
) {
  const input = {
    phase: 'past' as InvoiceStatement.Input['phase'],
    today: '2026-11-02',
    purchases: 0,
    installments: 0,
    expectedRecurring: 0,
    bankTotal: null,
    totalOverride: null,
    paid: 0,
    ...overrides,
  } satisfies Record<string, unknown>;

  return InvoiceStatement.compute({
    phase: input.phase,
    today: BusinessDate.of(input.today),
    closesOn: BusinessDate.of(CLOSES_ON),
    dueOn: BusinessDate.of(DUE_ON),
    purchases: cents(input.purchases),
    installments: cents(input.installments),
    expectedRecurring: cents(input.expectedRecurring),
    bankTotal: input.bankTotal === null ? null : cents(input.bankTotal),
    totalOverride: input.totalOverride === null ? null : cents(input.totalOverride),
    paid: cents(input.paid),
  });
}

describe('InvoiceStatement.compute: total', () => {
  it('sums purchases, installments and the expected recurrences', () => {
    const statement = compute({
      phase: 'current',
      today: '2026-10-10',
      purchases: 10000,
      installments: 2500,
      expectedRecurring: 990,
    });

    expect(statement.computedTotal.cents).toBe(13490);
    expect(statement.total.cents).toBe(13490);
    expect(statement.purchases.cents).toBe(10000);
    expect(statement.installments.cents).toBe(2500);
    expect(statement.expectedRecurring.cents).toBe(990);
  });

  it('counts the expected recurrences in a projected invoice', () => {
    const statement = compute({ phase: 'projected', purchases: 1000, expectedRecurring: 500 });

    expect(statement.expectedRecurring.cents).toBe(500);
    expect(statement.computedTotal.cents).toBe(1500);
  });

  it('drops the expected recurrences once the invoice is past', () => {
    const statement = compute({ phase: 'past', purchases: 1000, expectedRecurring: 500 });

    expect(statement.expectedRecurring.cents).toBe(0);
    expect(statement.computedTotal.cents).toBe(1000);
    expect(statement.total.cents).toBe(1000);
  });

  it('has no floor: refunds bigger than the spending make a negative total (credit)', () => {
    const statement = compute({ purchases: -3000, installments: 1000 });

    expect(statement.computedTotal.cents).toBe(-2000);
    expect(statement.total.cents).toBe(-2000);
  });

  it('prefers the total of the bank over the calculated one', () => {
    const statement = compute({ purchases: 10000, bankTotal: 10250 });

    expect(statement.computedTotal.cents).toBe(10000);
    expect(statement.total.cents).toBe(10250);
  });

  it('prefers the correction over the total of the bank', () => {
    const statement = compute({ purchases: 10000, bankTotal: 10250, totalOverride: 9800 });

    expect(statement.total.cents).toBe(9800);
  });

  it('accepts a correction of zero and lets it win over the bank', () => {
    const statement = compute({ purchases: 10000, bankTotal: 10250, totalOverride: 0 });

    expect(statement.total.cents).toBe(0);
  });

  it('accepts a bank total of zero over the calculated one', () => {
    const statement = compute({ purchases: 10000, bankTotal: 0 });

    expect(statement.total.cents).toBe(0);
  });

  it('keeps the paid amount', () => {
    expect(compute({ purchases: 10000, paid: 4000 }).paid.cents).toBe(4000);
  });
});

describe('InvoiceStatement.compute: status', () => {
  it('is projected for a projected phase, whatever the other facts', () => {
    expect(compute({ phase: 'projected', today: '2026-12-01', purchases: 1000 }).status).toBe(
      'projected',
    );
    expect(
      compute({ phase: 'projected', today: '2026-12-01', purchases: 1000, paid: 1000 }).status,
    ).toBe('projected');
  });

  it('is open before the closing, with nothing paid', () => {
    expect(compute({ phase: 'current', today: '2026-10-10', purchases: 5000 }).status).toBe('open');
  });

  it('is open on the closing day itself', () => {
    expect(compute({ phase: 'current', today: CLOSES_ON, purchases: 5000 }).status).toBe('open');
  });

  it('is closed the day after the closing', () => {
    expect(compute({ today: '2026-10-31', purchases: 5000 }).status).toBe('closed');
  });

  it('is still closed on the due day', () => {
    expect(compute({ today: DUE_ON, purchases: 5000 }).status).toBe('closed');
  });

  it('is overdue the day after the due date', () => {
    expect(compute({ today: '2026-11-07', purchases: 5000 }).status).toBe('overdue');
  });

  it('is partial when something is paid before the due date', () => {
    expect(compute({ today: '2026-11-02', purchases: 5000, paid: 2000 }).status).toBe('partial');
  });

  it('is partial before the closing when something is paid and not all', () => {
    expect(
      compute({ phase: 'current', today: '2026-10-10', purchases: 5000, paid: 2000 }).status,
    ).toBe('partial');
  });

  it('is overdue, not partial, for a partial payment after the due date', () => {
    expect(compute({ today: '2026-11-07', purchases: 5000, paid: 2000 }).status).toBe('overdue');
  });

  it('is paid when the payments reach the total', () => {
    expect(compute({ today: '2026-11-02', purchases: 5000, paid: 5000 }).status).toBe('paid');
  });

  it('is paid even after the due date when the payments reach the total', () => {
    expect(compute({ today: '2026-11-20', purchases: 5000, paid: 5000 }).status).toBe('paid');
  });

  it('is paid when the payment is bigger than the total, with nothing left', () => {
    const statement = compute({ today: '2026-11-02', purchases: 5000, paid: 7000 });

    expect(statement.status).toBe('paid');
    expect(statement.remaining(Money.zero()).cents).toBe(0);
  });

  it('is paid when a payment is made in the open invoice and covers it', () => {
    expect(
      compute({ phase: 'current', today: '2026-10-10', purchases: 5000, paid: 5000 }).status,
    ).toBe('paid');
  });

  it('is paid for a closed invoice of total zero with no payment', () => {
    expect(compute({ today: '2026-10-31' }).status).toBe('paid');
  });

  it('is paid for an overdue invoice of total zero with no payment (paid wins over overdue)', () => {
    expect(compute({ today: '2026-11-20' }).status).toBe('paid');
  });

  it('is not paid for an open invoice of total zero with no payment', () => {
    expect(compute({ phase: 'current', today: '2026-10-10' }).status).toBe('open');
    expect(compute({ phase: 'current', today: CLOSES_ON }).status).toBe('open');
  });

  it('is paid for a closed invoice with a negative total (credit) and no payment', () => {
    expect(compute({ today: '2026-10-31', purchases: -500 }).status).toBe('paid');
  });

  it('is open for the open invoice with a negative total and no payment', () => {
    expect(compute({ phase: 'current', today: '2026-10-10', purchases: -500 }).status).toBe('open');
  });

  it('judges the status by the corrected total', () => {
    expect(compute({ today: '2026-11-02', purchases: 5000, totalOverride: 0 }).status).toBe('paid');
    expect(
      compute({ today: '2026-11-02', purchases: 5000, totalOverride: 4000, paid: 4000 }).status,
    ).toBe('paid');
  });
});

describe('InvoiceStatement.remaining and unpaid', () => {
  it('is the total minus what is paid', () => {
    const statement = compute({ purchases: 10000, paid: 3000 });

    expect(statement.remaining(Money.zero()).cents).toBe(7000);
    expect(statement.unpaid().cents).toBe(7000);
  });

  it('takes the presumed payment off as well', () => {
    const statement = compute({ purchases: 10000, paid: 3000 });

    expect(statement.remaining(cents(2000)).cents).toBe(5000);
    expect(statement.unpaid().cents).toBe(7000);
  });

  it('never goes below zero', () => {
    const statement = compute({ purchases: 10000, paid: 3000 });

    expect(statement.remaining(cents(9000)).cents).toBe(0);
  });

  it('is zero for a negative total', () => {
    expect(compute({ purchases: -2000 }).remaining(Money.zero()).cents).toBe(0);
  });

  it('is the whole total when nothing is paid', () => {
    expect(compute({ purchases: 10000 }).unpaid().cents).toBe(10000);
  });

  it('follows the corrected total', () => {
    expect(compute({ purchases: 10000, totalOverride: 8000, paid: 3000 }).unpaid().cents).toBe(
      5000,
    );
  });
});
