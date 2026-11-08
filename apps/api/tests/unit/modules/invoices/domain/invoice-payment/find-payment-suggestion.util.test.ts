import { describe, expect, it } from 'vitest';

import {
  findPaymentSuggestion,
  type PaymentCandidate,
} from '#/modules/invoices/domain/invoice-payment/find-payment-suggestion.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';

const CLOSES_ON = BusinessDate.of('2026-10-30');
const DUE_ON = BusinessDate.of('2026-11-06');

function candidate(overrides: {
  transactionId?: string;
  accountId?: string;
  cents?: number;
  occurredOn?: string;
}): PaymentCandidate {
  return {
    transactionId: overrides.transactionId ?? 'tx-1',
    accountId: overrides.accountId ?? 'checking-1',
    amount: Money.fromCents(overrides.cents ?? -10000),
    occurredOn: BusinessDate.of(overrides.occurredOn ?? '2026-11-05'),
    description: 'Pagamento fatura',
  };
}

function find(
  input: {
    debits?: PaymentCandidate[];
    credits?: PaymentCandidate[];
    lacking?: number;
    excluded?: string[];
  } = {},
) {
  return findPaymentSuggestion({
    debits: input.debits ?? [],
    credits: input.credits ?? [],
    lacking: Money.fromCents(input.lacking ?? 10000),
    closesOn: CLOSES_ON,
    dueOn: DUE_ON,
    excludedTransactionIds: new Set(input.excluded ?? []),
  });
}

describe('findPaymentSuggestion: window', () => {
  it('includes a debit on the closing day', () => {
    const debit = candidate({ occurredOn: '2026-10-30' });

    expect(find({ debits: [debit] })?.transaction).toBe(debit);
  });

  it('leaves out a debit the day before the closing', () => {
    expect(find({ debits: [candidate({ occurredOn: '2026-10-29' })] })).toBeNull();
  });

  it('includes a debit five days after the due date', () => {
    const debit = candidate({ occurredOn: '2026-11-11' });

    expect(find({ debits: [debit] })?.transaction).toBe(debit);
  });

  it('leaves out a debit six days after the due date', () => {
    expect(find({ debits: [candidate({ occurredOn: '2026-11-12' })] })).toBeNull();
  });

  it('includes a debit on the due date', () => {
    const debit = candidate({ occurredOn: '2026-11-06' });

    expect(find({ debits: [debit] })?.transaction).toBe(debit);
  });
});

describe('findPaymentSuggestion: eligibility', () => {
  it('leaves out a positive transaction', () => {
    expect(find({ debits: [candidate({ cents: 10000 })] })).toBeNull();
  });

  it('leaves out a transaction of value zero', () => {
    expect(find({ debits: [candidate({ cents: 0 })], lacking: 0 })).toBeNull();
  });

  it('leaves out an excluded transaction (already linked or dismissed)', () => {
    const debit = candidate({ transactionId: 'tx-1' });

    expect(find({ debits: [debit], excluded: ['tx-1'] })).toBeNull();
  });

  it('keeps the other transactions when one is excluded', () => {
    const excluded = candidate({ transactionId: 'tx-1' });
    const other = candidate({ transactionId: 'tx-2' });

    expect(find({ debits: [excluded, other], excluded: ['tx-1'] })?.transaction).toBe(other);
  });

  it('returns null with no debit', () => {
    expect(find()).toBeNull();
  });
});

describe('findPaymentSuggestion: value match', () => {
  it('matches the exact value that is lacking', () => {
    const debit = candidate({ cents: -10000 });

    expect(find({ debits: [debit], lacking: 10000 })?.transaction).toBe(debit);
  });

  it('matches R$ 1,00 above what is lacking', () => {
    const debit = candidate({ cents: -10100 });

    expect(find({ debits: [debit], lacking: 10000 })?.transaction).toBe(debit);
  });

  it('matches R$ 1,00 below what is lacking', () => {
    const debit = candidate({ cents: -9900 });

    expect(find({ debits: [debit], lacking: 10000 })?.transaction).toBe(debit);
  });

  it('does not match one cent above the tolerance', () => {
    expect(find({ debits: [candidate({ cents: -10101 })], lacking: 10000 })).toBeNull();
  });

  it('does not match one cent below the tolerance', () => {
    expect(find({ debits: [candidate({ cents: -9899 })], lacking: 10000 })).toBeNull();
  });
});

describe('findPaymentSuggestion: mirror credit', () => {
  it('matches by the mirror credit even when the value differs from what is lacking', () => {
    const debit = candidate({ cents: -5000 });
    const credit = candidate({
      transactionId: 'credit-1',
      accountId: 'card-1',
      cents: 5000,
      occurredOn: '2026-11-05',
    });

    const result = find({ debits: [debit], credits: [credit], lacking: 10000 });

    expect(result?.transaction).toBe(debit);
    expect(result?.isPresumed).toBe(true);
  });

  it('accepts a mirror with a difference of one cent', () => {
    const debit = candidate({ cents: -5000 });
    const credit = candidate({ transactionId: 'credit-1', accountId: 'card-1', cents: 5001 });

    expect(find({ debits: [debit], credits: [credit], lacking: 10000 })).not.toBeNull();
  });

  it('refuses a mirror with a difference of two cents', () => {
    const debit = candidate({ cents: -5000 });
    const credit = candidate({ transactionId: 'credit-1', accountId: 'card-1', cents: 5002 });

    expect(find({ debits: [debit], credits: [credit], lacking: 10000 })).toBeNull();
  });

  it('accepts a mirror three days before or after the debit', () => {
    const debit = candidate({ cents: -5000, occurredOn: '2026-11-05' });
    const before = candidate({ transactionId: 'c-1', cents: 5000, occurredOn: '2026-11-02' });
    const after = candidate({ transactionId: 'c-2', cents: 5000, occurredOn: '2026-11-08' });

    expect(find({ debits: [debit], credits: [before], lacking: 10000 })).not.toBeNull();
    expect(find({ debits: [debit], credits: [after], lacking: 10000 })).not.toBeNull();
  });

  it('refuses a mirror four days away', () => {
    const debit = candidate({ cents: -5000, occurredOn: '2026-11-05' });
    const before = candidate({ transactionId: 'c-1', cents: 5000, occurredOn: '2026-11-01' });
    const after = candidate({ transactionId: 'c-2', cents: 5000, occurredOn: '2026-11-09' });

    expect(find({ debits: [debit], credits: [before], lacking: 10000 })).toBeNull();
    expect(find({ debits: [debit], credits: [after], lacking: 10000 })).toBeNull();
  });

  it('refuses a negative credit as a mirror', () => {
    const debit = candidate({ cents: -5000 });
    const credit = candidate({ transactionId: 'c-1', cents: -5000 });

    expect(find({ debits: [debit], credits: [credit], lacking: 10000 })).toBeNull();
  });

  it('presumes the payment with the mirror even when the value also matches', () => {
    const debit = candidate({ cents: -10000 });
    const credit = candidate({ transactionId: 'c-1', cents: 10000 });
    const other = candidate({ transactionId: 'tx-2', cents: -10050 });

    const result = find({ debits: [debit, other], credits: [credit], lacking: 10000 });

    expect(result?.transaction).toBe(debit);
    expect(result?.isPresumed).toBe(true);
  });
});

describe('findPaymentSuggestion: several candidates', () => {
  it('picks the one with the smallest difference to what is lacking', () => {
    const far = candidate({ transactionId: 'tx-far', cents: -10080 });
    const near = candidate({ transactionId: 'tx-near', cents: -10010 });
    const below = candidate({ transactionId: 'tx-below', cents: -9950 });

    expect(find({ debits: [far, below, near], lacking: 10000 })?.transaction).toBe(near);
  });

  it('measures the difference both above and below', () => {
    const above = candidate({ transactionId: 'tx-above', cents: -10030 });
    const below = candidate({ transactionId: 'tx-below', cents: -9990 });

    expect(find({ debits: [above, below], lacking: 10000 })?.transaction).toBe(below);
  });

  it('breaks a tie of difference with the most recent date', () => {
    const older = candidate({ transactionId: 'tx-old', cents: -10000, occurredOn: '2026-11-02' });
    const newer = candidate({ transactionId: 'tx-new', cents: -10000, occurredOn: '2026-11-04' });

    expect(find({ debits: [older, newer], lacking: 10000 })?.transaction).toBe(newer);
    expect(find({ debits: [newer, older], lacking: 10000 })?.transaction).toBe(newer);
  });

  it('breaks a tie of difference and date with the greater id', () => {
    const a = candidate({ transactionId: 'tx-a', cents: -10000, occurredOn: '2026-11-04' });
    const b = candidate({ transactionId: 'tx-b', cents: -10000, occurredOn: '2026-11-04' });

    expect(find({ debits: [a, b], lacking: 10000 })?.transaction).toBe(b);
    expect(find({ debits: [b, a], lacking: 10000 })?.transaction).toBe(b);
  });
});

describe('findPaymentSuggestion: presumed', () => {
  it('is presumed when it is the only eligible candidate', () => {
    expect(find({ debits: [candidate({})] })?.isPresumed).toBe(true);
  });

  it('is not presumed with two eligible candidates and no mirror', () => {
    const a = candidate({ transactionId: 'tx-a', cents: -10000 });
    const b = candidate({ transactionId: 'tx-b', cents: -10020 });

    const result = find({ debits: [a, b], lacking: 10000 });

    expect(result?.transaction).toBe(a);
    expect(result?.isPresumed).toBe(false);
  });

  it('counts only the eligible candidates, not the ones that were left out', () => {
    const eligible = candidate({ transactionId: 'tx-a', cents: -10000 });
    const outsideWindow = candidate({
      transactionId: 'tx-b',
      cents: -10000,
      occurredOn: '2026-12-30',
    });
    const dismissed = candidate({ transactionId: 'tx-c', cents: -10000 });

    const result = find({
      debits: [eligible, outsideWindow, dismissed],
      lacking: 10000,
      excluded: ['tx-c'],
    });

    expect(result?.transaction).toBe(eligible);
    expect(result?.isPresumed).toBe(true);
  });

  it('is not presumed when the chosen one has no mirror, even if another candidate does', () => {
    const best = candidate({ transactionId: 'tx-best', cents: -10000 });
    const mirrored = candidate({ transactionId: 'tx-mirrored', cents: -5000 });
    const credit = candidate({ transactionId: 'c-1', cents: 5000 });

    const result = find({ debits: [best, mirrored], credits: [credit], lacking: 10000 });

    expect(result?.transaction).toBe(best);
    expect(result?.isPresumed).toBe(false);
  });
});
