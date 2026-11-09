import { describe, expect, it } from 'vitest';

import { TransactionIsSplitError } from '#/modules/transactions/domain/transaction/transaction-is-split.error.ts';
import { TransactionNatureLockedError } from '#/modules/transactions/domain/transaction/transaction-nature-locked.error.ts';
import { TransactionSplitLinkedToBillError } from '#/modules/transactions/domain/transaction/transaction-split-linked-to-bill.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestTransaction } from '#tests/support/transactions/transaction/build-test-transaction.util.ts';

const NOW = '2026-11-07T12:00:00.000Z';
const food = { id: 'cat-food', kind: 'expense' as const, isArchived: false };
const salary = { id: 'cat-salary', kind: 'income' as const, isArchived: false };

const dinner = () =>
  buildTestTransaction({
    amount: Money.fromCents(-30000),
    categoryId: 'cat-food',
    categorySource: 'user',
  });
const pix = () =>
  buildTestTransaction({ nature: 'income', amount: Money.fromCents(15000), method: 'pix' });

describe('Transaction.moveToFriend: lent', () => {
  it('the whole value: the expense becomes lent, chosen by Lucas, with no category', () => {
    const transaction = dinner();

    transaction.moveToFriend('lent', 30000, NOW);

    expect(transaction).toMatchObject({
      nature: 'lent',
      natureSetBy: 'user',
      categoryId: null,
      categorySource: null,
      splits: [],
      updatedAt: NOW,
    });
    expect(transaction.hasCountedNature()).toBe(false);
  });

  it('a part: splits in two, the rest keeps expense and the category, the friend part is lent', () => {
    const transaction = dinner();

    transaction.moveToFriend('lent', 11600, NOW);

    expect(transaction.nature).toBe('expense');
    expect(transaction.categoryId).toBeNull();
    expect(
      transaction.splits.map((part) => [
        part.position,
        part.amount.cents,
        part.nature,
        part.categoryId,
      ]),
    ).toEqual([
      [1, -18400, 'expense', 'cat-food'],
      [2, -11600, 'lent', null],
    ]);
    expect(transaction.splits.reduce((sum, part) => sum + part.amount.cents, 0)).toBe(-30000);
    expect(transaction.splits[1]?.isOutsideSpending()).toBe(true);
  });

  it('refuses zero, negative and more than the transaction', () => {
    expect(() => {
      dinner().moveToFriend('lent', 0, NOW);
    }).toThrow(RangeError);
    expect(() => {
      dinner().moveToFriend('lent', 30001, NOW);
    }).toThrow(RangeError);
  });

  it('refuses what is not a whole expense', () => {
    expect(() => {
      pix().moveToFriend('lent', 100, NOW);
    }).toThrow(TransactionNatureLockedError);
    const split = dinner();
    split.moveToFriend('lent', 100, NOW);
    expect(() => {
      split.moveToFriend('lent', 100, NOW);
    }).toThrow(TransactionIsSplitError);
  });

  it('once split for a friend, the split cannot be redone nor undone by hand', () => {
    const transaction = dinner();
    transaction.moveToFriend('lent', 11600, NOW);

    expect(() => {
      transaction.unsplit(NOW);
    }).toThrow(TransactionSplitLinkedToBillError);
  });
});

describe('Transaction.moveToFriend: reimbursed', () => {
  it('the whole value: the income becomes reimbursed, outside the income', () => {
    const transaction = pix();

    transaction.moveToFriend('reimbursed', 15000, NOW);

    expect(transaction.nature).toBe('reimbursed');
    expect(transaction.natureSetBy).toBe('user');
    expect(transaction.hasCountedNature()).toBe(false);
  });

  it('a part: what was owed is reimbursed, the rest stays income', () => {
    const transaction = pix();

    transaction.moveToFriend('reimbursed', 5800, NOW);

    expect(transaction.splits.map((part) => [part.amount.cents, part.nature])).toEqual([
      [9200, 'income'],
      [5800, 'reimbursed'],
    ]);
  });

  it('refuses an expense', () => {
    expect(() => {
      dinner().moveToFriend('reimbursed', 100, NOW);
    }).toThrow(TransactionNatureLockedError);
  });
});

describe('Transaction.returnFromFriend', () => {
  it('a whole lent goes back to expense, decided by the system, with no category', () => {
    const transaction = dinner();
    transaction.moveToFriend('lent', 30000, NOW);

    expect(transaction.returnFromFriend('lent', NOW)).toBe(true);

    expect(transaction).toMatchObject({
      nature: 'expense',
      natureSetBy: 'system',
      categoryId: null,
    });
    expect(transaction.isInReview()).toBe(true);
  });

  it('a split one is whole again, with the category of the part of Lucas', () => {
    const transaction = dinner();
    transaction.moveToFriend('lent', 11600, NOW);

    expect(transaction.returnFromFriend('lent', NOW)).toBe(true);

    expect(transaction).toMatchObject({
      nature: 'expense',
      splits: [],
      categoryId: 'cat-food',
      categorySource: 'user',
    });
  });

  it('a reimbursed one goes back to income, whole or split', () => {
    const whole = pix();
    whole.moveToFriend('reimbursed', 15000, NOW);
    const split = pix();
    split.moveToFriend('reimbursed', 5800, NOW);

    expect(whole.returnFromFriend('reimbursed', NOW)).toBe(true);
    expect(split.returnFromFriend('reimbursed', NOW)).toBe(true);

    expect(whole).toMatchObject({ nature: 'income', natureSetBy: 'system' });
    expect(split).toMatchObject({ nature: 'income', splits: [] });
  });

  it('does nothing when there is nothing to give back', () => {
    const transaction = dinner();

    expect(transaction.returnFromFriend('lent', NOW)).toBe(false);
    expect(transaction.returnFromFriend('reimbursed', NOW)).toBe(false);
    expect(transaction.updatedAt).not.toBe(NOW);
  });
});

describe('Transaction.applyBillCategory and clearBillCategory', () => {
  it('puts the category of the bill when there is none, with the origin bill', () => {
    const transaction = buildTestTransaction({ amount: Money.fromCents(-8000) });

    expect(transaction.applyBillCategory(food, NOW)).toBe(true);

    expect(transaction).toMatchObject({ categoryId: 'cat-food', categorySource: 'bill' });
  });

  it('never replaces a category that is already there', () => {
    const transaction = buildTestTransaction({ categoryId: 'other', categorySource: 'user' });

    expect(transaction.applyBillCategory(food, NOW)).toBe(false);
    expect(transaction.categoryId).toBe('other');
  });

  it('does not put a category of the other kind, an archived one, nor on a split transaction', () => {
    expect(buildTestTransaction({}).applyBillCategory(salary, NOW)).toBe(false);
    expect(buildTestTransaction({}).applyBillCategory({ ...food, isArchived: true }, NOW)).toBe(
      false,
    );
    const split = dinner();
    split.moveToFriend('lent', 100, NOW);
    expect(split.applyBillCategory(food, NOW)).toBe(false);
  });

  it('takes off only the category that the bill had put', () => {
    const fromBill = buildTestTransaction({ categoryId: 'cat-food', categorySource: 'bill' });
    const fromUser = buildTestTransaction({ categoryId: 'cat-food', categorySource: 'user' });

    expect(fromBill.clearBillCategory(NOW)).toBe(true);
    expect(fromBill).toMatchObject({ categoryId: null, categorySource: null });
    expect(fromUser.clearBillCategory(NOW)).toBe(false);
    expect(fromUser.categoryId).toBe('cat-food');
  });
});
