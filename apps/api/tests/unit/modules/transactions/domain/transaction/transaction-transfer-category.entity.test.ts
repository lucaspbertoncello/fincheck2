import { describe, expect, it } from 'vitest';

import { TransactionNatureLockedError } from '#/modules/transactions/domain/transaction/transaction-nature-locked.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestTransaction } from '#tests/support/transactions/transaction/build-test-transaction.util.ts';

const NOW = '2026-11-08T12:00:00.000Z';
const CHECKING = { isCardAccount: false };
const FOOD = { id: 'food', kind: 'expense', isArchived: false } as const;
const ROTATION = { id: 'rotation', kind: 'expense', isArchived: false, isTransfer: true } as const;

describe('a category that is a transfer (isTransfer)', () => {
  describe('choosing it', () => {
    it('turns an expense into a transfer and keeps the category and the choice of the user', () => {
      const transaction = buildTestTransaction({ natureSetBy: 'system' });

      transaction.assignCategory(ROTATION, NOW, CHECKING);

      expect(transaction).toMatchObject({
        nature: 'transfer',
        natureSetBy: 'user',
        categoryId: 'rotation',
        categorySource: 'user',
        categoryRuleId: null,
        transferCounterpartId: null,
        updatedAt: NOW,
      });
      expect(transaction.hasCountedNature()).toBe(false);
      expect(transaction.isInReview()).toBe(false);
    });

    it('also takes an income, whatever the kind of the category', () => {
      const transaction = buildTestTransaction({
        nature: 'income',
        amount: Money.fromCents(5000),
      });

      transaction.assignCategory(ROTATION, NOW, CHECKING);

      expect(transaction).toMatchObject({ nature: 'transfer', categoryId: 'rotation' });
    });

    it('keeps the other leg of a transfer that already was one', () => {
      const transaction = buildTestTransaction({
        nature: 'transfer',
        transferCounterpartId: 'other-leg',
      });

      transaction.assignCategory(ROTATION, NOW, CHECKING);

      expect(transaction).toMatchObject({
        nature: 'transfer',
        categoryId: 'rotation',
        transferCounterpartId: 'other-leg',
      });
    });

    it.each(['lent', 'reimbursed', 'balance_adjustment'] as const)(
      'is refused on a locked nature (%s), with the code of the nature',
      (nature) => {
        const transaction = buildTestTransaction({ nature });

        expect(() => {
          transaction.assignCategory(ROTATION, NOW, CHECKING);
        }).toThrow(TransactionNatureLockedError);
        expect(transaction.nature).toBe(nature);
      },
    );

    it('is refused on a paid invoice', () => {
      const transaction = buildTestTransaction({ nature: 'invoice_payment' });

      expect(() => {
        transaction.assignCategory(ROTATION, NOW, { ...CHECKING, hasActiveInvoiceLink: true });
      }).toThrow(TransactionNatureLockedError);
    });

    it('is refused on a transaction tied to an occurrence or to a bill', () => {
      expect(() => {
        buildTestTransaction().assignCategory(ROTATION, NOW, {
          ...CHECKING,
          hasActiveOccurrenceLink: true,
        });
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }));
      expect(() => {
        buildTestTransaction().assignCategory(ROTATION, NOW, {
          ...CHECKING,
          hasActiveBillLink: true,
        });
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }));
    });

    it('is refused on a split transaction', () => {
      const transaction = buildTestTransaction();
      transaction.splitInto(
        [
          { amount: Money.fromCents(1000), category: null, description: null },
          { amount: Money.fromCents(250), category: null, description: null },
        ],
        NOW,
      );

      expect(() => {
        transaction.assignCategory(ROTATION, NOW, CHECKING);
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }));
    });

    it('is refused when archived', () => {
      expect(() => {
        buildTestTransaction().assignCategory({ ...ROTATION, isArchived: true }, NOW, CHECKING);
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }));
    });

    it('answers in advance whether the transaction can take it', () => {
      expect(buildTestTransaction().canTakeTransferCategory(CHECKING)).toBe(true);
      expect(buildTestTransaction({ nature: 'lent' }).canTakeTransferCategory(CHECKING)).toBe(
        false,
      );
      expect(
        buildTestTransaction().canTakeTransferCategory({
          ...CHECKING,
          hasActiveBillLink: true,
        }),
      ).toBe(false);
    });
  });

  describe('leaving it', () => {
    function rotation(overrides: Parameters<typeof buildTestTransaction>[0] = {}) {
      return buildTestTransaction({
        nature: 'transfer',
        natureSetBy: 'user',
        categoryId: 'rotation',
        categorySource: 'user',
        ...overrides,
      });
    }

    it('goes back to expense by the sign when the category is taken off', () => {
      const transaction = rotation();

      transaction.assignCategory(null, NOW, CHECKING);

      expect(transaction).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        categoryId: null,
        categorySource: null,
        transferCounterpartId: null,
      });
      expect(transaction.isInReview()).toBe(true);
    });

    it('goes back to income when the value is positive', () => {
      const transaction = rotation({ amount: Money.fromCents(5000) });

      transaction.assignCategory(null, NOW, CHECKING);

      expect(transaction.nature).toBe('income');
    });

    it('goes back to expense on a card even with a positive value (a refund)', () => {
      const transaction = rotation({ amount: Money.fromCents(5000) });

      transaction.assignCategory(null, NOW, { isCardAccount: true });

      expect(transaction.nature).toBe('expense');
    });

    it('goes back by the sign and takes an ordinary category when replaced by one', () => {
      const transaction = rotation();

      transaction.assignCategory(FOOD, NOW, CHECKING);

      expect(transaction).toMatchObject({
        nature: 'expense',
        categoryId: 'food',
        categorySource: 'user',
      });
    });

    it('goes back by the sign when the nature is changed to expense by hand', () => {
      const transaction = rotation();

      transaction.changeNature(
        'expense',
        { hasActiveInvoiceLink: false, isCardAccount: false },
        NOW,
      );

      expect(transaction).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('changing the nature to transfer (to link the other leg) keeps the category', () => {
      const transaction = rotation();

      transaction.changeNature('transfer', { isCardAccount: false }, NOW);

      expect(transaction).toMatchObject({ nature: 'transfer', categoryId: 'rotation' });
    });

    it('a plain transfer (no category) refuses an ordinary category as before', () => {
      const transaction = buildTestTransaction({ nature: 'transfer' });

      expect(() => {
        transaction.assignCategory(FOOD, NOW, CHECKING);
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_NOT_ALLOWED' }));
    });
  });

  describe('where it never lands by itself', () => {
    it('is not taken as the category of a recurrence or a bill', () => {
      const transaction = buildTestTransaction();

      expect(transaction.applyRecurrenceCategory(ROTATION, NOW)).toBe(false);
      expect(transaction.applyBillCategory(ROTATION, NOW)).toBe(false);
      expect(transaction).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('is refused as the category of a part of a split', () => {
      const transaction = buildTestTransaction();

      expect(() => {
        transaction.splitInto(
          [
            { amount: Money.fromCents(1000), category: ROTATION, description: null },
            { amount: Money.fromCents(250), category: null, description: null },
          ],
          NOW,
        );
      }).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_NOT_ALLOWED' }));
    });
  });

  describe('a rule with it', () => {
    const rule = { id: 'rule-1', category: ROTATION, tagIds: [] };

    it('turns a free expense into a transfer, with the origin rule', () => {
      const transaction = buildTestTransaction({ natureSetBy: 'system' });

      expect(transaction.applyRule(rule, new Set(), NOW)).toBe(true);

      expect(transaction).toMatchObject({
        nature: 'transfer',
        categoryId: 'rotation',
        categorySource: 'rule',
        categoryRuleId: 'rule-1',
      });
    });

    it('also sees an income: the rule with it counts for both directions', () => {
      const transaction = buildTestTransaction({
        nature: 'income',
        amount: Money.fromCents(5000),
      });

      expect(transaction.applyRule(rule, new Set(), NOW)).toBe(true);

      expect(transaction).toMatchObject({
        nature: 'transfer',
        categoryId: 'rotation',
        categorySource: 'rule',
      });
    });

    it('never touches what Lucas categorized', () => {
      const transaction = buildTestTransaction({ categoryId: 'food', categorySource: 'user' });

      expect(transaction.applyRule(rule, new Set(), NOW)).toBe(false);
      expect(transaction).toMatchObject({ nature: 'expense', categoryId: 'food' });
    });

    it('skips a transaction tied to an occurrence or a bill (a locked nature)', () => {
      const transaction = buildTestTransaction();

      expect(
        transaction.applyRule(rule, new Set(), NOW, { ...CHECKING, hasActiveBillLink: true }),
      ).toBe(false);
      expect(transaction).toMatchObject({ nature: 'expense', categoryId: null });
    });
  });

  describe('undo of a bulk action', () => {
    it('gives back the nature by the sign when the state before had no category', () => {
      const transaction = buildTestTransaction();
      const before = transaction.previousState();
      transaction.assignCategory(ROTATION, NOW, CHECKING);

      transaction.restoreState(before, { ruleStillExists: false, isCardAccount: false }, NOW);

      expect(transaction).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('gives back the natureSetBy the transaction had, not always the system', () => {
      const transaction = buildTestTransaction({ natureSetBy: 'user' });
      const before = transaction.previousState();
      transaction.assignCategory(ROTATION, NOW, CHECKING);

      transaction.restoreState(before, { ruleStillExists: false, isCardAccount: false }, NOW);

      expect(before.natureSetBy).toBe('user');
      expect(transaction).toMatchObject({ nature: 'expense', natureSetBy: 'user' });
    });
  });

  // Rule of the rebase on the tags of a category (PM, 09/11/2026): a transfer by category keeps the
  // category, so it keeps the tags of that category too; only really taking the category away (or
  // the nature leaving it) takes the tags.
  describe('tags', () => {
    const rotationTag = (id: string) => ({ id, categoryId: 'rotation', isArchived: false });

    it('takes the tags of the old category off when the transfer category replaces it', () => {
      const transaction = buildTestTransaction({
        categoryId: 'food',
        categorySource: 'user',
        tagIds: ['feira'],
      });

      transaction.assignCategory(ROTATION, NOW, CHECKING);

      expect(transaction).toMatchObject({ categoryId: 'rotation', tagIds: [] });
    });

    it('takes tags of its own category and keeps them when the category is chosen again', () => {
      const transaction = buildTestTransaction();
      transaction.assignCategory(ROTATION, NOW, CHECKING);
      transaction.replaceTags([rotationTag('conta')], NOW);

      transaction.assignCategory(ROTATION, NOW, CHECKING);
      expect(transaction.tagIds).toEqual(['conta']);
    });

    it('a rule that puts it takes the tags of the old category off', () => {
      const transaction = buildTestTransaction({
        categoryId: 'food',
        categorySource: 'rule',
        categoryRuleId: 'rule-0',
        tagIds: ['feira'],
      });

      transaction.applyRule(
        { id: 'rule-1', category: ROTATION, tagIds: ['conta'] },
        new Set(),
        NOW,
        CHECKING,
      );

      expect(transaction).toMatchObject({ categoryId: 'rotation', tagIds: ['conta'] });
    });

    it('the undo of a bulk action gives back the category and the tags of a transfer by category', () => {
      const transaction = buildTestTransaction();
      transaction.assignCategory(ROTATION, NOW, CHECKING);
      transaction.replaceTags([rotationTag('conta')], NOW);
      const before = transaction.previousState();

      transaction.ignore(NOW);
      transaction.restoreState(before, { ruleStillExists: false }, NOW);

      expect(transaction).toMatchObject({
        nature: 'transfer',
        categoryId: 'rotation',
        tagIds: ['conta'],
        ignoredAt: null,
      });
    });

    it('loses them when the category is taken off or the nature leaves the transfer', () => {
      const taken = buildTestTransaction();
      taken.assignCategory(ROTATION, NOW, CHECKING);
      taken.replaceTags([rotationTag('conta')], NOW);
      taken.assignCategory(null, NOW, CHECKING);
      expect(taken).toMatchObject({ categoryId: null, tagIds: [] });

      const left = buildTestTransaction();
      left.assignCategory(ROTATION, NOW, CHECKING);
      left.replaceTags([rotationTag('conta')], NOW);
      left.changeNature('expense', CHECKING, NOW);
      expect(left).toMatchObject({ categoryId: null, tagIds: [] });
    });
  });
});
