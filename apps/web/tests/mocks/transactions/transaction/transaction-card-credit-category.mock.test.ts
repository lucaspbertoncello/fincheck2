import { apiErrorSchema } from '@fincheck/shared/common/api-error/api-error.schema.ts';
import { transactionDtoSchema } from '@fincheck/shared/transactions/transaction/transaction.schema.ts';
import { bulkTransactionsResultSchema } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.schema.ts';
import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { makeTransactionRecord } from '#mocks/state/seed/make-transaction-record.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

function activeCategory(kind: 'expense' | 'income') {
  const category = db.categories.find(
    (entry) => entry.kind === kind && !entry.isTransfer && entry.archivedAt === null,
  );
  if (!category) throw new Error(`seed without a ${kind} category`);

  return category;
}

// A refund: a credit on a card, an expense with a positive value, as the bank sends it.
function addCardCredit() {
  const card = db.accounts.find((account) => account.creditCard);
  if (!card?.creditCard) throw new Error('seed without a card');
  const record = makeTransactionRecord({
    accountId: card.id,
    method: 'credit',
    description: 'ESTORNO TESTE',
    amountCents: 5990,
    occurredOn: TODAY,
    nature: 'expense',
    invoiceMonth: TODAY.slice(0, 7),
  });
  db.transactions.push(record);

  return record;
}

function addCardDebit() {
  const credit = addCardCredit();
  const record = makeTransactionRecord({
    accountId: credit.accountId,
    method: 'credit',
    description: 'COMPRA TESTE',
    amountCents: -5990,
    occurredOn: TODAY,
    invoiceMonth: credit.invoiceMonth,
  });
  db.transactions.push(record);

  return record;
}

async function categorize(id: string, categoryId: string | null) {
  return callApi('PATCH', `/transactions/${id}`, { categoryId });
}

describe('card credit and its category (mock of the API rule)', () => {
  it('keeps it an expense with a category of expense, and turns it into income with one of income', async () => {
    const credit = addCardCredit();

    const abated = await categorize(credit.id, activeCategory('expense').id);
    expect(abated.status).toBe(200);
    expect(transactionDtoSchema.parse(abated.json)).toMatchObject({
      nature: 'expense',
      amountCents: 5990,
    });

    const earned = await categorize(credit.id, activeCategory('income').id);
    expect(earned.status).toBe(200);
    expect(transactionDtoSchema.parse(earned.json)).toMatchObject({
      nature: 'income',
      natureSetBy: 'user',
      amountCents: 5990,
      categoryId: activeCategory('income').id,
    });
  });

  it('goes back to expense when the category is taken off or swapped for one of expense', async () => {
    const credit = addCardCredit();
    await categorize(credit.id, activeCategory('income').id);

    const cleared = await categorize(credit.id, null);
    expect(transactionDtoSchema.parse(cleared.json)).toMatchObject({
      nature: 'expense',
      categoryId: null,
    });

    await categorize(credit.id, activeCategory('income').id);
    const swapped = await categorize(credit.id, activeCategory('expense').id);
    expect(transactionDtoSchema.parse(swapped.json).nature).toBe('expense');
  });

  it('still refuses a category of income on a debit on a card', async () => {
    const debit = addCardDebit();

    const answer = await categorize(debit.id, activeCategory('income').id);

    expect(answer.status).toBe(422);
    expect(apiErrorSchema.parse(answer.json).code).toBe('TRANSACTION_CATEGORY_KIND_MISMATCH');
  });

  it('still asks the same kind of category in an ordinary account', async () => {
    const income = db.transactions.find(
      (tx) =>
        tx.nature === 'income' &&
        tx.splits.length === 0 &&
        !db.accounts.find((account) => account.id === tx.accountId)?.creditCard,
    );
    if (!income) throw new Error('seed without an income');

    const answer = await categorize(income.id, activeCategory('expense').id);

    expect(apiErrorSchema.parse(answer.json).code).toBe('TRANSACTION_CATEGORY_KIND_MISMATCH');
  });

  it('refuses to make a credit on a card income by hand', async () => {
    const credit = addCardCredit();

    const answer = await callApi('PATCH', `/transactions/${credit.id}`, { nature: 'income' });

    expect(answer.status).toBe(400);
    expect(apiErrorSchema.parse(answer.json).code).toBe('VALIDATION_FAILED');
    expect(credit.nature).toBe('expense');
  });

  it('categorizes in bulk with either kind and the undo brings the nature back', async () => {
    const credit = addCardCredit();
    const earn = activeCategory('income');

    const answer = await callApi('POST', '/transactions/bulk', {
      transactionIds: [credit.id],
      action: { type: 'categorize', categoryId: earn.id },
    });
    const result = bulkTransactionsResultSchema.parse(answer.json);

    expect(result).toMatchObject({ updatedCount: 1, skipped: [] });
    expect(credit).toMatchObject({ nature: 'income', categoryId: earn.id });

    const undo = await callApi('POST', '/transactions/bulk/restore', { items: result.previous });

    expect(undo.status).toBe(200);
    expect(credit).toMatchObject({ nature: 'expense', categoryId: null });
  });

  it('skips a category of income on a debit on a card in bulk', async () => {
    const debit = addCardDebit();

    const answer = await callApi('POST', '/transactions/bulk', {
      transactionIds: [debit.id],
      action: { type: 'categorize', categoryId: activeCategory('income').id },
    });

    expect(bulkTransactionsResultSchema.parse(answer.json).skipped).toEqual([
      { transactionId: debit.id, reason: 'category_kind_mismatch' },
    ]);
  });

  it('lets a credit that is income go back to expense by hand, which lets go of the category', async () => {
    const credit = addCardCredit();
    await categorize(credit.id, activeCategory('income').id);

    const answer = await callApi('PATCH', `/transactions/${credit.id}`, { nature: 'expense' });

    expect(answer.status).toBe(200);
    expect(transactionDtoSchema.parse(answer.json)).toMatchObject({
      nature: 'expense',
      categoryId: null,
    });
  });
});
