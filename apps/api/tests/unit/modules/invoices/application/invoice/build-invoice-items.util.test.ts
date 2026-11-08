import { describe, expect, it } from 'vitest';

import type { RecurrenceExpectationReader } from '#/modules/invoices/application/invoice/recurrence-expectation-reader.interface.ts';
import { buildInvoiceItems } from '#/modules/invoices/application/invoice/build-invoice-items.util.ts';
import { buildTestCardInvoiceItem } from '#tests/support/invoices/invoice/build-test-card-invoice-item.util.ts';

const item = buildTestCardInvoiceItem;

function expectation(
  overrides: Partial<RecurrenceExpectationReader.Expectation> = {},
): RecurrenceExpectationReader.Expectation {
  return {
    occurrenceId: 'occ-1',
    recurrenceName: 'Netflix',
    expectedOn: '2026-10-20',
    amountCents: 4590,
    ...overrides,
  };
}

function idsOf(items: ReturnType<typeof buildInvoiceItems>) {
  return items.map((line) =>
    line.type === 'transaction' ? line.transactionId : line.occurrenceId,
  );
}

describe('buildInvoiceItems', () => {
  it('returns nothing for no transactions and no expectations', () => {
    expect(buildInvoiceItems([], [])).toEqual([]);
  });

  it('maps a transaction to a transaction line', () => {
    const result = buildInvoiceItems(
      [
        item({
          transactionId: 'tx-1',
          description: 'Mercado',
          occurredOn: '2026-10-12',
          amountCents: -3000,
          categoryId: 'market',
          installment: { number: 2, count: 3 },
        }),
      ],
      [],
    );

    expect(result).toEqual([
      {
        type: 'transaction',
        transactionId: 'tx-1',
        description: 'Mercado',
        occurredOn: '2026-10-12',
        amountCents: -3000,
        categoryId: 'market',
        installment: { number: 2, count: 3 },
      },
    ]);
  });

  it('maps an expectation to an expected recurrence line', () => {
    const result = buildInvoiceItems([], [expectation()]);

    expect(result).toEqual([
      {
        type: 'expected_recurrence',
        occurrenceId: 'occ-1',
        recurrenceName: 'Netflix',
        expectedOn: '2026-10-20',
        amountCents: 4590,
      },
    ]);
  });

  it('makes the category of a split transaction null', () => {
    const result = buildInvoiceItems(
      [
        item({
          categoryId: 'ignored',
          parts: [{ categoryId: 'food', amountCents: -1250, nature: 'expense' }],
        }),
      ],
      [],
    );

    expect(result[0]).toMatchObject({ type: 'transaction', categoryId: null });
  });

  it('orders by date, newest first', () => {
    const result = buildInvoiceItems(
      [
        item({ transactionId: 'a', occurredOn: '2026-10-05' }),
        item({ transactionId: 'b', occurredOn: '2026-10-25' }),
        item({ transactionId: 'c', occurredOn: '2026-10-15' }),
      ],
      [],
    );

    expect(idsOf(result)).toEqual(['b', 'c', 'a']);
  });

  it('mixes the expected recurrences by their expected date', () => {
    const result = buildInvoiceItems(
      [
        item({ transactionId: 'a', occurredOn: '2026-10-05' }),
        item({ transactionId: 'b', occurredOn: '2026-10-25' }),
      ],
      [expectation({ occurrenceId: 'occ-1', expectedOn: '2026-10-15' })],
    );

    expect(idsOf(result)).toEqual(['b', 'occ-1', 'a']);
  });

  it('breaks a tie of date with the greater id', () => {
    const result = buildInvoiceItems(
      [
        item({ transactionId: 'tx-a', occurredOn: '2026-10-05' }),
        item({ transactionId: 'tx-c', occurredOn: '2026-10-05' }),
        item({ transactionId: 'tx-b', occurredOn: '2026-10-05' }),
      ],
      [],
    );

    expect(idsOf(result)).toEqual(['tx-c', 'tx-b', 'tx-a']);
  });

  it('puts an expectation with no date at the end', () => {
    const result = buildInvoiceItems(
      [item({ transactionId: 'a', occurredOn: '2026-10-05' })],
      [expectation({ occurrenceId: 'occ-undated', expectedOn: null })],
    );

    expect(idsOf(result)).toEqual(['a', 'occ-undated']);
  });

  it('orders several expectations with no date by the greater id, after the dated lines', () => {
    const result = buildInvoiceItems(
      [item({ transactionId: 'a', occurredOn: '2026-10-05' })],
      [
        expectation({ occurrenceId: 'occ-1', expectedOn: null }),
        expectation({ occurrenceId: 'occ-3', expectedOn: null }),
        expectation({ occurrenceId: 'occ-2', expectedOn: '2026-01-01' }),
      ],
    );

    expect(idsOf(result)).toEqual(['a', 'occ-2', 'occ-3', 'occ-1']);
  });
});
