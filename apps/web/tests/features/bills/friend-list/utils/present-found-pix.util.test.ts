import type { Bill } from '@fincheck/shared/bills/bill/bill.type.ts';
import { describe, expect, it } from 'vitest';

import type { FoundFriendPayment } from '#/domain/bills/bill/rules/list-found-friend-payments.rule.ts';
import { presentFoundPix } from '#/features/bills/friend-list/utils/present-found-pix.util.ts';
import { makeTransaction } from '#tests/support/transactions/make-transaction.util.ts';

const found = { billId: 'b1', transactionId: 't1', amountCents: 10_000 } as FoundFriendPayment;
const debts = [{ id: 'b1', description: 'Jantar na Nonna' }] as Bill.Dto[];

describe('presentFoundPix', () => {
  it('names the day the transaction found happened and the debt it pays', () => {
    const transactions = { t1: makeTransaction({ id: 't1', occurredOn: '2026-11-05' }) };

    expect(presentFoundPix(found, debts, transactions)).toEqual({
      billId: 'b1',
      title: 'Pix achado em 05/11',
      detail: 'Para "Jantar na Nonna", ainda sem vínculo',
      amountCents: 10_000,
    });
  });

  it('has no day while the transaction is still loading', () => {
    expect(presentFoundPix(found, debts, {}).title).toBe('Pix achado');
  });
});
