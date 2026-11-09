import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function cardPurchaseFromBank() {
  const cards = new Set(
    db.accounts.filter((account) => account.type === 'credit_card').map((account) => account.id),
  );
  const found = db.transactions.find(
    (tx) =>
      cards.has(tx.accountId) &&
      tx.origin === 'bank' &&
      tx.invoiceMonth !== null &&
      tx.installment === null &&
      tx.bankChange === null &&
      tx.splits.length === 0,
  );
  if (!found) throw new Error('seed without a card purchase from the bank');

  return found;
}

describe('transaction: the bank version and the invoice month (mock vs api 13, 14)', () => {
  it('restoring the original date of a card purchase puts it back on the invoice of that date', async () => {
    const tx = cardPurchaseFromBank();
    const originalMonth = tx.invoiceMonth;
    await callApi('PATCH', `/transactions/${tx.id}`, { occurredOn: addDays(tx.occurredOn, 70) });
    expect(tx.invoiceMonth).not.toBe(originalMonth);

    const restored = await callApi('POST', `/transactions/${tx.id}/restore-original`);

    expect(restored.status).toBe(200);
    expect(tx.invoiceMonth).toBe(originalMonth);
  });

  it('taking the bank version of a change of date moves the invoice month too', async () => {
    const tx = cardPurchaseFromBank();
    const originalMonth = tx.invoiceMonth;
    const movedOn = addDays(tx.occurredOn, 70);
    tx.bankChange = {
      detectedAt: tx.createdAt,
      changes: [{ field: 'occurredOn', before: tx.occurredOn, after: movedOn }],
    };

    const resolved = await callApi('POST', `/transactions/${tx.id}/bank-change/resolve`, {
      use: 'bank',
    });

    expect(resolved.status).toBe(200);
    expect(tx.occurredOn).toBe(movedOn);
    expect(tx.invoiceMonth).not.toBe(originalMonth);
  });

  it('refuses the bank version of a removed split transaction whose amount Lucas edited', async () => {
    const tx = cardPurchaseFromBank();
    const amount = Math.abs(tx.amountCents);
    tx.splits = [
      {
        id: 'a',
        position: 1,
        amountCents: -(amount - 100),
        nature: 'expense',
        categoryId: null,
        description: null,
      },
      {
        id: 'b',
        position: 2,
        amountCents: -100,
        nature: 'expense',
        categoryId: null,
        description: null,
      },
    ] as typeof tx.splits;
    tx.amountCents = -amount - 500;
    tx.removedByBankAt = tx.createdAt;
    if (tx.bank) tx.bank.amountCents = -amount;
    tx.editNote = 'meu valor';

    const answer = await callApi('POST', `/transactions/${tx.id}/bank-change/resolve`, {
      use: 'bank',
    });

    expect(answer.status).toBe(422);
    expect(apiErrorSchema.parse(answer.json).code).toBe('TRANSACTION_IS_SPLIT');
  });
});
