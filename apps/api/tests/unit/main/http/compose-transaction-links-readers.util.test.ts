import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';
import { describe, expect, it } from 'vitest';

import { composeTransactionLinksReaders } from '#/main/http/compose-transaction-links-readers.util.ts';
import type { TransactionLinksReader } from '#/modules/transactions/application/transaction/transaction-links-reader.interface.ts';

const links = (partial: Partial<Transaction.LinksDto>): Transaction.LinksDto => ({
  occurrence: null,
  bill: null,
  invoicePayment: null,
  ...partial,
});
const reader = (answer: Record<string, Transaction.LinksDto>): TransactionLinksReader => ({
  linksOf: () => Promise.resolve(new Map(Object.entries(answer))),
});

describe('composeTransactionLinksReaders', () => {
  it('keeps the link each reader found for a transaction', async () => {
    const composed = composeTransactionLinksReaders(
      reader({ t1: links({ invoicePayment: { accountId: 'card', month: '2026-11' } }) }),
      reader({ t1: links({ occurrence: { occurrenceId: 'o1', recurrenceName: 'Netflix' } }) }),
    );

    const answer = await composed.linksOf(['t1']);

    expect(answer.get('t1')).toEqual({
      occurrence: { occurrenceId: 'o1', recurrenceName: 'Netflix' },
      bill: null,
      invoicePayment: { accountId: 'card', month: '2026-11' },
    });
  });

  it('does not let a reader that has no link for a field erase the one another found, whatever the order', async () => {
    const withBill = reader({
      t1: links({
        bill: {
          billId: 'b1',
          description: 'Luz',
          counterparty: null,
          role: 'payment',
          amountCents: 100,
        },
      }),
    });
    const empty = reader({ t1: links({}) });

    expect(
      (await composeTransactionLinksReaders(withBill, empty).linksOf(['t1'])).get('t1')?.bill,
    ).not.toBeNull();
    expect(
      (await composeTransactionLinksReaders(empty, withBill).linksOf(['t1'])).get('t1')?.bill,
    ).not.toBeNull();
  });

  it('leaves out a transaction that no reader knows, and answers each one apart', async () => {
    const composed = composeTransactionLinksReaders(
      reader({ t1: links({ occurrence: { occurrenceId: 'o1', recurrenceName: 'A' } }) }),
      reader({ t2: links({ invoicePayment: { accountId: 'card', month: '2026-10' } }) }),
    );

    const answer = await composed.linksOf(['t1', 't2', 't3']);

    expect([...answer.keys()].toSorted()).toEqual(['t1', 't2']);
    expect(answer.get('t1')?.invoicePayment).toBeNull();
    expect(answer.get('t2')?.occurrence).toBeNull();
  });

  it('answers an empty map with no reader', async () => {
    expect((await composeTransactionLinksReaders().linksOf(['t1'])).size).toBe(0);
  });
});
