import { describe, expect, it } from 'vitest';

import { db } from '#mocks/state/mock-database.store.ts';
import { callApi } from '#tests/support/mocks/call-api.util.ts';
import { resetDatabaseBeforeEach } from '#tests/support/mocks/reset-database-before-each.util.ts';

resetDatabaseBeforeEach();

// "Rotação entre contas" is a category that is a transfer: choosing it makes the transaction a
// transfer that keeps the category; taking it off gives the nature back by the sign.
function rotation() {
  const category = db.categories.find((item) => item.isTransfer);
  if (!category) throw new Error('seed without the category that is a transfer');

  return category;
}

function freeExpense() {
  const tx = db.transactions.find(
    (item) =>
      item.nature === 'expense' &&
      item.categoryId === null &&
      item.splits.length === 0 &&
      item.amountCents < 0,
  );
  if (!tx) throw new Error('seed without a free expense');

  return tx;
}

describe('the category that is a transfer (mock)', () => {
  it('is only "Rotação entre contas" in the seed, and a new category is not one', async () => {
    expect(db.categories.filter((item) => item.isTransfer).map((item) => item.name)).toEqual([
      'Rotação entre contas',
    ]);
    const created = await callApi('POST', '/categories', {
      kind: 'expense',
      name: 'Nova de teste',
      icon: 'tag',
    });

    expect(created.json).toMatchObject({ isTransfer: false });
  });

  it('turns an expense into a transfer that keeps the category, and gives the nature back', async () => {
    const tx = freeExpense();

    const chosen = await callApi('PATCH', `/transactions/${tx.id}`, { categoryId: rotation().id });

    expect(chosen.status).toBe(200);
    expect(chosen.json).toMatchObject({
      nature: 'transfer',
      natureSetBy: 'user',
      categoryId: rotation().id,
      transferCounterpartId: null,
    });

    const taken = await callApi('PATCH', `/transactions/${tx.id}`, { categoryId: null });

    expect(taken.json).toMatchObject({ nature: 'expense', categoryId: null });
  });

  it('is refused on a locked nature, with the code of the nature', async () => {
    const adjustment = freeExpense();
    adjustment.nature = 'balance_adjustment';

    const answer = await callApi('PATCH', `/transactions/${adjustment.id}`, {
      categoryId: rotation().id,
    });

    expect(answer.status).toBe(422);
    expect(answer.json).toMatchObject({ code: 'TRANSACTION_NATURE_LOCKED' });
  });

  it('bulk: transfers what is free, skips a transfer, and the undo gives the nature back', async () => {
    const tx = freeExpense();
    const plain = db.transactions.find((item) => item.nature === 'transfer' && !item.categoryId);
    if (!plain) throw new Error('seed without a plain transfer');

    const result = await callApi('POST', '/transactions/bulk', {
      transactionIds: [tx.id, plain.id],
      action: { type: 'categorize', categoryId: rotation().id },
    });

    const answer = result.json as {
      updatedCount: number;
      skipped: unknown[];
      previous: unknown[];
    };
    expect(answer.updatedCount).toBe(1);
    expect(answer.skipped).toEqual([{ transactionId: plain.id, reason: 'outside_account' }]);
    expect(tx.nature).toBe('transfer');

    await callApi('POST', '/transactions/bulk/restore', { items: answer.previous });

    expect(tx).toMatchObject({ nature: 'expense', categoryId: null });
  });

  it('takes a positive leg too (an income), as the API does', async () => {
    const income = db.transactions.find(
      (item) =>
        item.nature === 'income' &&
        item.categoryId === null &&
        item.splits.length === 0 &&
        item.amountCents > 0,
    );
    if (!income) throw new Error('seed without a free income');

    const chosen = await callApi('PATCH', `/transactions/${income.id}`, {
      categoryId: rotation().id,
    });

    expect(chosen.json).toMatchObject({ nature: 'transfer', categoryId: rotation().id });
  });

  it('linking the other leg with the nature keeps the category', async () => {
    const tx = freeExpense();
    await callApi('PATCH', `/transactions/${tx.id}`, { categoryId: rotation().id });
    const account = db.accounts.find((item) => item.id !== tx.accountId);
    if (!account) throw new Error('seed with a single account');
    const other = {
      ...structuredClone(tx),
      id: '0194f3a0-0000-7000-8000-00000000ffff',
      accountId: account.id,
      nature: 'income' as const,
      amountCents: -tx.amountCents,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      transferCounterpartId: null,
      tagIds: [],
    };
    db.transactions.push(other);

    const linked = await callApi('PATCH', `/transactions/${tx.id}`, {
      nature: 'transfer',
      transferCounterpartId: other.id,
    });

    expect(linked.json).toMatchObject({
      nature: 'transfer',
      categoryId: rotation().id,
      transferCounterpartId: other.id,
    });
  });

  it('the undo gives back the natureSetBy the transaction had', async () => {
    const tx = freeExpense();
    tx.natureSetBy = 'user';
    const result = await callApi('POST', '/transactions/bulk', {
      transactionIds: [tx.id],
      action: { type: 'categorize', categoryId: rotation().id },
    });

    await callApi('POST', '/transactions/bulk/restore', {
      items: (result.json as { previous: unknown[] }).previous,
    });

    expect(tx).toMatchObject({ nature: 'expense', natureSetBy: 'user' });
  });
});
