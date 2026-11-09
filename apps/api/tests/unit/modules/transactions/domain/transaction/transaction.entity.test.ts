import { describe, expect, it } from 'vitest';

import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { TransactionIsSplitError } from '#/modules/transactions/domain/transaction/transaction-is-split.error.ts';
import { TransactionNatureLockedError } from '#/modules/transactions/domain/transaction/transaction-nature-locked.error.ts';
import { TransactionSplit } from '#/modules/transactions/domain/transaction/transaction-split.value-object.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import { buildTestTransaction } from '#tests/support/transactions/transaction/build-test-transaction.util.ts';
import { buildTestBankTransaction } from '#tests/support/transactions/transaction/build-test-bank-transaction.util.ts';
import { TEST_NOW } from '#tests/support/transactions/transaction/test-now.constant.ts';

const LATER = '2026-11-07T09:00:00.000Z';
const CHECKING: Transaction.AccountRef = { id: 'account-1', isCard: false, isArchived: false };
const CARD: Transaction.AccountRef = { id: 'card-1', isCard: true, isArchived: false };
const FOOD = { id: 'food', kind: 'expense', isArchived: false } as const;
const SALARY = { id: 'salary', kind: 'income', isArchived: false } as const;

const date = (value: string) => BusinessDate.of(value);
const cents = (value: number) => Money.fromCents(value);

function manualInput(overrides: Partial<Transaction.CreateManualInput> = {}) {
  return {
    type: 'expense',
    account: CHECKING,
    method: 'pix',
    description: 'Padaria',
    amount: cents(1250),
    occurredOn: date('2026-11-05'),
    invoiceMonth: null,
    category: null,
    tags: [],
    ...overrides,
  } satisfies Transaction.CreateManualInput;
}

function split(amount: number, category: Transaction.CategoryRef | null = null) {
  return { amount: cents(amount), category, description: null };
}

describe('Transaction.createManual', () => {
  it('writes an expense as a negative value and an income as a positive one', () => {
    expect(Transaction.createManual(manualInput(), TEST_NOW).amount.cents).toBe(-1250);
    expect(Transaction.createManual(manualInput({ type: 'income' }), TEST_NOW).amount.cents).toBe(
      1250,
    );
  });

  it('is manual, chosen by the user, without original and without category', () => {
    const transaction = Transaction.createManual(manualInput(), TEST_NOW);

    expect(transaction).toMatchObject({
      origin: 'manual',
      nature: 'expense',
      natureSetBy: 'user',
      bank: null,
      categoryId: null,
      categorySource: null,
      splits: [],
      tagIds: [],
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    });
    expect(transaction.isEdited()).toBe(false);
    expect(transaction.isInReview()).toBe(true);
  });

  it('keeps the category chosen by the user and leaves the review', () => {
    const transaction = Transaction.createManual(manualInput({ category: FOOD }), TEST_NOW);

    expect(transaction).toMatchObject({ categoryId: 'food', categorySource: 'user' });
    expect(transaction.isInReview()).toBe(false);
  });

  it('refuses an archived account', () => {
    expect(() =>
      Transaction.createManual(
        manualInput({ account: { ...CHECKING, isArchived: true } }),
        TEST_NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_ACCOUNT_ARCHIVED' }));
  });

  it('wants credit on a card and only on a card', () => {
    expect(() => Transaction.createManual(manualInput({ method: 'credit' }), TEST_NOW)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_METHOD_ACCOUNT_MISMATCH' }),
    );
    expect(() =>
      Transaction.createManual(
        manualInput({ account: CARD, method: 'pix', invoiceMonth: Month.of('2026-11') }),
        TEST_NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_METHOD_ACCOUNT_MISMATCH' }));
  });

  it('gives a card purchase its invoice month and nothing else its own', () => {
    const purchase = Transaction.createManual(
      manualInput({ account: CARD, method: 'credit', invoiceMonth: Month.of('2026-12') }),
      TEST_NOW,
    );

    expect(purchase.invoiceMonth?.value).toBe('2026-12');
    expect(() =>
      Transaction.createManual(manualInput({ account: CARD, method: 'credit' }), TEST_NOW),
    ).toThrow(RangeError);
    expect(() =>
      Transaction.createManual(manualInput({ invoiceMonth: Month.of('2026-12') }), TEST_NOW),
    ).toThrow(RangeError);
  });

  it('refuses a category of the other kind, an archived category and an archived tag', () => {
    expect(() => Transaction.createManual(manualInput({ category: SALARY }), TEST_NOW)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() =>
      Transaction.createManual(manualInput({ category: { ...FOOD, isArchived: true } }), TEST_NOW),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }));
    expect(() =>
      Transaction.createManual(
        manualInput({
          category: FOOD,
          tags: [{ id: 'old', categoryId: 'food', isArchived: true }],
        }),
        TEST_NOW,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_TAG_ARCHIVED' }));
  });

  it('refuses a value that is not positive', () => {
    expect(() => Transaction.createManual(manualInput({ amount: cents(0) }), TEST_NOW)).toThrow(
      RangeError,
    );
    expect(() => Transaction.createManual(manualInput({ amount: cents(-5) }), TEST_NOW)).toThrow(
      RangeError,
    );
  });

  it('does not repeat a tag', () => {
    const transaction = Transaction.createManual(
      manualInput({
        category: FOOD,
        tags: [
          { id: 'a', categoryId: 'food', isArchived: false },
          { id: 'a', categoryId: 'food', isArchived: false },
        ],
      }),
      TEST_NOW,
    );

    expect(transaction.tagIds).toEqual(['a']);
  });
});

describe('credit on a card is never income', () => {
  it('refuses income created on a card, and the nature income on a card refund', () => {
    expect(() =>
      Transaction.createManual(
        manualInput({
          type: 'income',
          account: CARD,
          method: 'credit',
          invoiceMonth: Month.of('2026-11'),
        }),
        TEST_NOW,
      ),
    ).toThrow(RequestValidationError);
    const refund = buildTestTransaction({ amount: cents(1500), nature: 'expense' });

    expect(() =>
      refund.changeNature('income', { hasActiveInvoiceLink: false, isCardAccount: true }, LATER),
    ).toThrow(RequestValidationError);
    expect(refund.nature).toBe('expense');
    expect(() =>
      refund.changeNature('income', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER),
    ).not.toThrow();
  });
});

describe('Transaction.assignCategory of a credit on a card', () => {
  const onCard = { isCardAccount: true } as const;
  const onChecking = { isCardAccount: false } as const;
  const refund = (overrides: Partial<Transaction.Attributes> = {}) =>
    buildTestTransaction({
      accountId: 'card-1',
      method: 'credit',
      invoiceMonth: Month.of('2026-11'),
      amount: cents(1500),
      nature: 'expense',
      natureSetBy: 'system',
      ...overrides,
    });

  it('keeps an expense with its positive value when the category is an expense one', () => {
    const credit = refund();
    credit.assignCategory(FOOD, LATER, onCard);

    expect(credit).toMatchObject({
      nature: 'expense',
      natureSetBy: 'system',
      amount: cents(1500),
      categoryId: 'food',
      categorySource: 'user',
    });
  });

  it('turns into an income, set by Lucas, when the category is an income one', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);

    expect(credit).toMatchObject({
      nature: 'income',
      natureSetBy: 'user',
      amount: cents(1500),
      categoryId: 'salary',
      categorySource: 'user',
    });
  });

  it('goes back to expense when the income category is taken off', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);
    credit.assignCategory(null, LATER, onCard);

    expect(credit).toMatchObject({
      nature: 'expense',
      natureSetBy: 'system',
      amount: cents(1500),
      categoryId: null,
    });
  });

  it('goes back to expense, with the old tags gone, when an expense category replaces it', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);
    credit.replaceTags([{ id: 'tag-1', categoryId: 'salary', isArchived: false }], LATER);
    credit.assignCategory(FOOD, LATER, onCard);

    expect(credit).toMatchObject({ nature: 'expense', categoryId: 'food', tagIds: [] });
  });

  it('stays an income when another income category replaces it', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);
    credit.assignCategory({ id: 'extra', kind: 'income', isArchived: false }, LATER, onCard);

    expect(credit).toMatchObject({ nature: 'income', natureSetBy: 'user', categoryId: 'extra' });
  });

  it('comes out of the category that is a transfer into the kind of the next category', () => {
    const credit = refund();
    const rotation = {
      id: 'rotation',
      kind: 'income',
      isArchived: false,
      isTransfer: true,
    } as const;
    credit.assignCategory(rotation, LATER, onCard);
    credit.assignCategory(SALARY, LATER, onCard);

    expect(credit).toMatchObject({ nature: 'income', categoryId: 'salary' });
  });

  it('still refuses a category of income on a purchase on the card (a negative value)', () => {
    const purchase = refund({ amount: cents(-1500) });

    expect(() => purchase.assignCategory(SALARY, LATER, onCard)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(purchase.nature).toBe('expense');
  });

  it('still wants the kind of the nature outside a card, for a credit as for a debit', () => {
    const inflow = buildTestTransaction({ amount: cents(1500), nature: 'income' });
    const refundOnChecking = buildTestTransaction({ amount: cents(1500), nature: 'expense' });

    expect(() => inflow.assignCategory(FOOD, LATER, onChecking)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() => refundOnChecking.assignCategory(SALARY, LATER, onChecking)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() => inflow.assignCategory(SALARY, LATER, onChecking)).not.toThrow();
    expect(inflow.nature).toBe('income');
  });

  it('refuses an archived category and leaves the nature alone', () => {
    const credit = refund();

    expect(() => credit.assignCategory({ ...SALARY, isArchived: true }, LATER, onCard)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }),
    );
    expect(credit.nature).toBe('expense');
  });

  it('keeps the nature locks: an occurrence, a bill, a split and the natures another flow owns', () => {
    expect(() =>
      refund().assignCategory(SALARY, LATER, { ...onCard, hasActiveOccurrenceLink: true }),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }));
    expect(() =>
      refund().assignCategory(SALARY, LATER, { ...onCard, hasActiveBillLink: true }),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }));
    expect(() =>
      refund({ nature: 'balance_adjustment' }).assignCategory(SALARY, LATER, onCard),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_NOT_ALLOWED' }));
    const divided = refund();
    divided.splitInto([split(1000), split(500)], TEST_NOW);
    expect(() => divided.assignCategory(SALARY, LATER, onCard)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }),
    );
  });

  it('is never turned into an income by hand, but may be turned back into an expense', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);
    const manual = refund();

    expect(() => manual.changeNature('income', onCard, LATER)).toThrow(RequestValidationError);
    credit.changeNature('expense', onCard, LATER);

    expect(credit).toMatchObject({
      nature: 'expense',
      natureSetBy: 'user',
      amount: cents(1500),
      categoryId: null,
      categorySource: null,
    });
  });

  it('keeps the sign rule of the nature outside a card', () => {
    const inflow = buildTestTransaction({ amount: cents(1500), nature: 'income' });

    expect(() => inflow.changeNature('expense', onChecking, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NATURE_SIGN_MISMATCH' }),
    );
  });

  it('keeps the value and the income when the amount is edited', () => {
    const credit = refund();
    credit.assignCategory(SALARY, LATER, onCard);
    credit.edit({ amount: cents(2000) }, LATER);

    expect(credit).toMatchObject({ nature: 'income', amount: cents(2000), categoryId: 'salary' });
  });

  describe('the nature locks when the category goes away', () => {
    const income = () => {
      const credit = refund();
      credit.assignCategory(SALARY, LATER, onCard);

      return credit;
    };

    it('refuses to take the category off a credit that is income and tied to an occurrence or a bill', () => {
      const tied = income();
      const paid = income();

      expect(() =>
        tied.assignCategory(null, LATER, { ...onCard, hasActiveOccurrenceLink: true }),
      ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }));
      expect(() =>
        paid.assignCategory(null, LATER, { ...onCard, hasActiveBillLink: true }),
      ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }));
      expect(tied).toMatchObject({ nature: 'income', categoryId: 'salary' });
      expect(paid).toMatchObject({ nature: 'income', categoryId: 'salary' });
    });

    it('takes the category off an expense credit that is tied, as nothing changes', () => {
      const credit = refund();
      credit.assignCategory(FOOD, LATER, onCard);

      expect(() =>
        credit.assignCategory(null, LATER, { ...onCard, hasActiveOccurrenceLink: true }),
      ).not.toThrow();
      expect(credit).toMatchObject({ nature: 'expense', categoryId: null });
    });

    it('goes back to expense when it is split and the split is undone, with no category left', () => {
      const credit = income();
      credit.splitInto([split(1000, SALARY), split(500, { ...SALARY, id: 'extra' })], LATER);

      expect(credit).toMatchObject({ nature: 'income', categoryId: null });
      credit.unsplit(LATER, onCard);

      expect(credit).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        amount: cents(1500),
        categoryId: null,
        splits: [],
      });
    });

    it('refuses to undo the split of a credit that is income and tied, and leaves it split', () => {
      const credit = income();
      credit.splitInto([split(1000, SALARY), split(500, SALARY)], LATER);

      expect(() => credit.unsplit(LATER, { ...onCard, hasActiveOccurrenceLink: true })).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }),
      );
      expect(credit.isSplit()).toBe(true);
      expect(credit.nature).toBe('income');
    });

    it('splits a credit that is income only with parts of income, and an expense credit only with parts of expense', () => {
      const expenseCredit = refund();

      expect(() => income().splitInto([split(1000, FOOD), split(500)], LATER)).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
      );
      expect(() => expenseCredit.splitInto([split(1000, SALARY), split(500)], LATER)).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
      );
      expect(() => expenseCredit.splitInto([split(1000, FOOD), split(500)], LATER)).not.toThrow();
    });

    it('keeps the nature on a split that stays an expense or is not on a card', () => {
      const expenseCredit = refund();
      expenseCredit.splitInto([split(1000, FOOD), split(500)], LATER);
      const inflow = buildTestTransaction({ amount: cents(1500), nature: 'income' });
      inflow.splitInto([split(1000, SALARY), split(500)], LATER);

      expenseCredit.unsplit(LATER, onCard);
      inflow.unsplit(LATER, onChecking);

      expect(expenseCredit.nature).toBe('expense');
      expect(inflow.nature).toBe('income');
    });
  });

  describe('the sign the bank sends', () => {
    const credit = () => {
      const transaction = refund({
        origin: 'bank',
        natureSetBy: 'system',
        bank: {
          description: 'ESTORNO',
          amount: cents(3500),
          occurredOn: date('2026-11-05'),
          counterparty: null,
          status: 'posted',
        },
        amount: cents(3500),
      });
      transaction.assignCategory(SALARY, LATER, onCard);

      return transaction;
    };
    const flipped = (amount = -3500): Transaction.BankVersion => ({
      description: 'ESTORNO',
      amount: cents(amount),
      occurredOn: date('2026-11-05'),
      counterparty: null,
      status: 'posted',
    });

    it('turns an income into an expense, with no category, when the bank turns the sign', () => {
      const transaction = credit();
      transaction.applyBankVersion(flipped(), LATER);

      expect(transaction).toMatchObject({
        nature: 'expense',
        natureSetBy: 'system',
        amount: cents(-3500),
        categoryId: null,
        categorySource: null,
        tagIds: [],
      });
    });

    it('keeps the income when the bank sends another positive value', () => {
      const transaction = credit();
      transaction.applyBankVersion(flipped(4000), LATER);

      expect(transaction).toMatchObject({ nature: 'income', amount: cents(4000) });
    });

    it('does the same when Lucas takes the value of the bank on the alert, and on "restaurar original"', () => {
      const edited = credit();
      edited.edit({ amount: cents(3600) }, LATER);
      edited.applyBankVersion(flipped(), LATER);
      expect(edited).toMatchObject({ nature: 'income', amount: cents(3600) });

      edited.resolveBankChange('bank', LATER);
      expect(edited).toMatchObject({ nature: 'expense', amount: cents(-3500), categoryId: null });

      const restored = credit();
      restored.edit({ amount: cents(3600) }, LATER);
      restored.applyBankVersion(flipped(), LATER);
      restored.restoreOriginal(LATER);
      expect(restored).toMatchObject({ nature: 'expense', amount: cents(-3500), categoryId: null });
    });

    it('does not touch an expense whose sign the bank turns', () => {
      const transaction = refund({
        origin: 'bank',
        bank: {
          description: 'ESTORNO',
          amount: cents(3500),
          occurredOn: date('2026-11-05'),
          counterparty: null,
          status: 'posted',
        },
        amount: cents(3500),
      });
      transaction.assignCategory(FOOD, LATER, onCard);
      transaction.applyBankVersion(flipped(), LATER);

      expect(transaction).toMatchObject({
        nature: 'expense',
        amount: cents(-3500),
        categoryId: 'food',
      });
    });
  });

  describe('the undo of an action when a link was made meanwhile', () => {
    it('leaves the nature, the category and the tags as they are, only the ignore goes back, and answers false', () => {
      const credit = refund();
      const before = credit.previousState();
      credit.assignCategory(SALARY, LATER, onCard);

      const restored = credit.restoreState(
        before,
        {
          ruleStillExists: true,
          isCardAccount: true,
          savedCategoryKind: null,
          hasActiveOccurrenceLink: true,
        },
        LATER,
      );

      expect(restored).toBe(false);
      expect(credit).toMatchObject({ nature: 'income', natureSetBy: 'user', categoryId: 'salary' });
    });

    it('also leaves the income when the saved income category would come back over a tied expense', () => {
      const credit = refund();
      credit.assignCategory(SALARY, LATER, onCard);
      const before = credit.previousState();
      credit.assignCategory(FOOD, LATER, onCard);

      const restored = credit.restoreState(
        before,
        {
          ruleStillExists: true,
          isCardAccount: true,
          savedCategoryKind: 'income',
          hasActiveBillLink: true,
        },
        LATER,
      );

      expect(restored).toBe(false);
      expect(credit).toMatchObject({ nature: 'expense', categoryId: 'food' });
    });

    it('answers true when nothing locks it', () => {
      const credit = refund();
      const before = credit.previousState();
      credit.assignCategory(SALARY, LATER, onCard);

      expect(
        credit.restoreState(
          before,
          { ruleStillExists: true, isCardAccount: true, savedCategoryKind: null },
          LATER,
        ),
      ).toBe(true);
      expect(credit.nature).toBe('expense');
    });
  });

  describe('why a bulk categorization skips it', () => {
    it('does not skip a credit on a card for either kind, and skips a purchase of the other kind', () => {
      expect(refund().whyCannotTakeCategory(SALARY, onCard)).toBeNull();
      expect(refund().whyCannotTakeCategory(FOOD, onCard)).toBeNull();
      expect(refund({ amount: cents(-1500) }).whyCannotTakeCategory(SALARY, onCard)).toBe(
        'category_kind_mismatch',
      );
      expect(
        buildTestTransaction({ amount: cents(1500), nature: 'income' }).whyCannotTakeCategory(
          FOOD,
          onChecking,
        ),
      ).toBe('category_kind_mismatch');
    });

    it('skips a credit whose nature a link locks', () => {
      expect(
        refund().whyCannotTakeCategory(SALARY, { ...onCard, hasActiveOccurrenceLink: true }),
      ).toBe('outside_account');
    });
  });

  describe('the undo of an action that categorized it', () => {
    it('gives the expense back when there was no category', () => {
      const credit = refund();
      const before = credit.previousState();
      credit.assignCategory(SALARY, LATER, onCard);
      credit.restoreState(
        before,
        { ruleStillExists: true, isCardAccount: true, savedCategoryKind: null },
        LATER,
      );

      expect(credit).toMatchObject({ nature: 'expense', natureSetBy: 'system', categoryId: null });
    });

    it('gives the income back when the saved category was an income one', () => {
      const credit = refund();
      credit.assignCategory(SALARY, LATER, onCard);
      const before = credit.previousState();
      credit.assignCategory(FOOD, LATER, onCard);
      credit.restoreState(
        before,
        { ruleStillExists: true, isCardAccount: true, savedCategoryKind: 'income' },
        LATER,
      );

      expect(credit).toMatchObject({ nature: 'income', natureSetBy: 'user', categoryId: 'salary' });
    });

    it('leaves the nature alone when the caller did not read the kind of the saved category', () => {
      const credit = refund();
      credit.assignCategory(SALARY, LATER, onCard);
      credit.restoreState(
        credit.previousState(),
        { ruleStillExists: true, isCardAccount: true },
        LATER,
      );

      expect(credit.nature).toBe('income');
    });
  });
});

describe('Transaction.createBalanceAdjustment', () => {
  it('is outside the account, never zero, with the sign of the difference', () => {
    const adjustment = Transaction.createBalanceAdjustment(
      { accountId: 'a', amount: cents(-2500), occurredOn: date('2026-11-06'), note: null },
      TEST_NOW,
    );

    expect(adjustment).toMatchObject({
      nature: 'balance_adjustment',
      origin: 'manual',
      method: 'other',
      description: 'Ajuste de saldo',
    });
    expect(adjustment.amount.cents).toBe(-2500);
    expect(adjustment.hasCountedNature()).toBe(false);
    expect(adjustment.isInReview()).toBe(false);
    expect(() =>
      Transaction.createBalanceAdjustment(
        { accountId: 'a', amount: cents(0), occurredOn: date('2026-11-06'), note: null },
        TEST_NOW,
      ),
    ).toThrow(RangeError);
  });

  it('puts the note in the description', () => {
    const adjustment = Transaction.createBalanceAdjustment(
      { accountId: 'a', amount: cents(100), occurredOn: date('2026-11-06'), note: 'Saldo inicial' },
      TEST_NOW,
    );

    expect(adjustment.description).toBe('Ajuste de saldo: Saldo inicial');
  });
});

describe('what counts (BR-TRX-006, N13)', () => {
  it('counts only expense and income', () => {
    for (const nature of ['expense', 'income'] as const) {
      expect(buildTestTransaction({ nature }).hasCountedNature()).toBe(true);
    }
    for (const nature of [
      'transfer',
      'invoice_payment',
      'balance_adjustment',
      'lent',
      'reimbursed',
    ] as const) {
      expect(buildTestTransaction({ nature }).hasCountedNature()).toBe(false);
    }
  });

  it('takes an ignored transaction out of every account', () => {
    const transaction = buildTestTransaction({ ignoredAt: TEST_NOW });

    expect(transaction.entersAccounts()).toBe(false);
    expect(transaction.isInReview()).toBe(false);
  });

  it('takes out a transaction the bank removed, unless Lucas edited it', () => {
    const untouched = buildTestBankTransaction({ removedByBankAt: TEST_NOW });
    const edited = buildTestBankTransaction({
      removedByBankAt: TEST_NOW,
      description: 'Padaria da esquina',
    });

    expect(untouched.entersAccounts()).toBe(false);
    expect(untouched.isInReview()).toBe(false);
    expect(edited.entersAccounts()).toBe(true);
  });

  it('is in review only without category and without split', () => {
    expect(buildTestTransaction().isInReview()).toBe(true);
    expect(buildTestTransaction({ categoryId: 'food' }).isInReview()).toBe(false);
    expect(buildTestTransaction({ nature: 'transfer' }).isInReview()).toBe(false);

    const divided = buildTestTransaction();
    divided.splitInto([split(1000), split(250)], TEST_NOW);
    expect(divided.isInReview()).toBe(false);
  });

  it('is edited when description, amount or date differ from the bank', () => {
    expect(buildTestBankTransaction().isEdited()).toBe(false);
    expect(buildTestBankTransaction({ description: 'Outra' }).isEdited()).toBe(true);
    expect(buildTestBankTransaction({ amount: cents(-1300) }).isEdited()).toBe(true);
    expect(buildTestBankTransaction({ occurredOn: date('2026-11-04') }).isEdited()).toBe(true);
    expect(buildTestTransaction().isEdited()).toBe(false);
  });
});

describe('Transaction.competenceOn', () => {
  it('is the date it happened, without a plan', () => {
    expect(buildTestTransaction().competenceOn(null).value).toBe('2026-11-05');
  });

  it('is the day of the purchase in the month of the invoice, for an installment', () => {
    const parcel = buildTestBankTransaction({
      occurredOn: date('2026-10-12'),
      invoiceMonth: Month.of('2026-12'),
      installment: { planId: 'p', number: 3 },
    });

    expect(parcel.competenceOn(date('2026-10-12')).value).toBe('2026-12-12');
  });
});

describe('Transaction.edit', () => {
  it('changes description, date and note, and keeps the sign on the amount', () => {
    const expense = buildTestTransaction();
    expense.edit(
      {
        description: 'Padaria nova',
        amount: cents(1800),
        occurredOn: date('2026-11-04'),
        editNote: 'x',
      },
      LATER,
    );
    const income = buildTestTransaction({ nature: 'income', amount: cents(1000) });
    income.edit({ amount: cents(1500) }, LATER);

    expect(expense).toMatchObject({ description: 'Padaria nova', editNote: 'x', updatedAt: LATER });
    expect(expense.amount.cents).toBe(-1800);
    expect(expense.occurredOn.value).toBe('2026-11-04');
    expect(income.amount.cents).toBe(1500);
  });

  it('rebuilds the search text from the description in use', () => {
    const transaction = buildTestBankTransaction({
      bank: {
        description: 'PIX RECEBIDO',
        amount: cents(-1250),
        occurredOn: date('2026-11-05'),
        counterparty: 'João Prado',
        status: 'posted',
      },
    });
    transaction.edit({ description: 'Café da manhã' }, LATER);

    expect(transaction.searchText()).toBe('CAFE DA MANHA PIX RECEBIDO JOAO PRADO');
  });

  it('shows the edit against the bank and goes back to not edited when the three fields match', () => {
    const transaction = buildTestBankTransaction();
    transaction.edit({ description: 'Outra', amount: cents(1300) }, LATER);
    expect(transaction.isEdited()).toBe(true);

    transaction.edit({ description: 'PADARIA SANTA CLARA', amount: cents(1250) }, LATER);
    expect(transaction.isEdited()).toBe(false);
  });

  it('does not change the value of a split transaction', () => {
    const transaction = buildTestTransaction();
    transaction.splitInto([split(1000), split(250)], TEST_NOW);

    expect(() => transaction.edit({ amount: cents(2000) }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }),
    );
    expect(() => transaction.edit({ description: 'Nova' }, LATER)).not.toThrow();
  });
});

describe('Transaction.changeNature', () => {
  it("moves between expense, income and transfer and marks the choice as the user's", () => {
    const transaction = buildTestBankTransaction({ nature: 'income', amount: cents(500) });
    transaction.changeNature(
      'transfer',
      { hasActiveInvoiceLink: false, isCardAccount: false },
      LATER,
    );

    expect(transaction).toMatchObject({ nature: 'transfer', natureSetBy: 'user' });
  });

  it('clears the category when it becomes a transfer', () => {
    const transaction = buildTestTransaction({ categoryId: 'food', categorySource: 'rule' });
    transaction.changeNature(
      'transfer',
      { hasActiveInvoiceLink: false, isCardAccount: false },
      LATER,
    );

    expect(transaction).toMatchObject({
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
    });
  });

  it('wants the sign to fit the nature (N4)', () => {
    const outflow = buildTestTransaction();
    const inflow = buildTestTransaction({ nature: 'transfer', amount: cents(1250) });

    expect(() =>
      outflow.changeNature('income', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NATURE_SIGN_MISMATCH' }));
    expect(() =>
      inflow.changeNature('expense', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NATURE_SIGN_MISMATCH' }));
    expect(() =>
      outflow.changeNature(
        'transfer',
        { hasActiveInvoiceLink: false, isCardAccount: false },
        LATER,
      ),
    ).not.toThrow();
  });

  it('leaves alone the nature a card refund already has', () => {
    const refund = buildTestTransaction({ amount: cents(500), nature: 'expense' });

    expect(() =>
      refund.changeNature('expense', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER),
    ).not.toThrow();
  });

  it('locks the natures that another flow owns', () => {
    for (const nature of ['lent', 'reimbursed', 'balance_adjustment'] as const) {
      expect(() =>
        buildTestTransaction({ nature }).changeNature(
          'expense',
          { hasActiveInvoiceLink: false, isCardAccount: false },
          LATER,
        ),
      ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NATURE_LOCKED' }));
    }
  });

  it('locks an invoice payment only while an invoice is linked to it', () => {
    const payment = () => buildTestTransaction({ nature: 'invoice_payment' });

    expect(() =>
      payment().changeNature(
        'transfer',
        { hasActiveInvoiceLink: true, isCardAccount: false },
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NATURE_LOCKED' }));
    expect(() =>
      payment().changeNature(
        'transfer',
        { hasActiveInvoiceLink: false, isCardAccount: false },
        LATER,
      ),
    ).not.toThrow();
  });

  it('refuses a split transaction', () => {
    const transaction = buildTestTransaction();
    transaction.splitInto([split(1000), split(250)], TEST_NOW);

    expect(() =>
      transaction.changeNature(
        'transfer',
        { hasActiveInvoiceLink: false, isCardAccount: false },
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }));
  });
});

describe('Transaction.returnNature (natureza devolvida)', () => {
  it('goes back by the sign: negative is an expense, positive is an income', () => {
    const out = buildTestTransaction({ nature: 'invoice_payment', natureSetBy: 'user' });
    const incoming = buildTestTransaction({ nature: 'reimbursed', amount: cents(900) });
    out.returnNature({ isCardAccount: false }, LATER);
    incoming.returnNature({ isCardAccount: false }, LATER);

    expect(out).toMatchObject({ nature: 'expense', natureSetBy: 'system' });
    expect(incoming).toMatchObject({ nature: 'income', natureSetBy: 'system' });
  });

  it('never makes income out of a credit on a card', () => {
    const refund = buildTestTransaction({ nature: 'invoice_payment', amount: cents(900) });
    refund.returnNature({ isCardAccount: true }, LATER);

    expect(refund.nature).toBe('expense');
  });

  it('lets go of the other leg of a transfer', () => {
    const leg = buildTestTransaction({ nature: 'transfer', transferCounterpartId: 'other' });
    leg.returnNature({ isCardAccount: false }, LATER);

    expect(leg.transferCounterpartId).toBe(null);
  });
});

describe('Transaction.linkTransfer', () => {
  const legs = () => {
    const out = buildTestTransaction({ accountId: 'a', amount: cents(-5000) });
    const into = buildTestTransaction({ accountId: 'b', amount: cents(5000), nature: 'income' });
    out.changeNature('transfer', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER);

    return { out, into };
  };

  it('makes both legs a transfer pointing at each other', () => {
    const { out, into } = legs();
    Transaction.linkTransfer(
      out,
      into,
      { secondHasInvoiceLink: false, secondIsCardAccount: false },
      LATER,
    );

    expect(out).toMatchObject({ nature: 'transfer', transferCounterpartId: into.id });
    expect(into).toMatchObject({
      nature: 'transfer',
      natureSetBy: 'user',
      transferCounterpartId: out.id,
    });
  });

  it('wants opposite values in two different accounts', () => {
    const { out, into } = legs();
    const sameAccount = buildTestTransaction({
      accountId: 'a',
      amount: cents(5000),
      nature: 'income',
    });
    const otherValue = buildTestTransaction({
      accountId: 'b',
      amount: cents(4000),
      nature: 'income',
    });

    expect(() =>
      Transaction.linkTransfer(
        out,
        sameAccount,
        { secondHasInvoiceLink: false, secondIsCardAccount: false },
        LATER,
      ),
    ).toThrow(RequestValidationError);
    expect(() =>
      Transaction.linkTransfer(
        out,
        otherValue,
        { secondHasInvoiceLink: false, secondIsCardAccount: false },
        LATER,
      ),
    ).toThrow(RequestValidationError);
    expect(into.transferCounterpartId).toBe(null);
  });

  it('respects a lock on the other leg', () => {
    const { out } = legs();
    const adjustment = buildTestTransaction({
      accountId: 'b',
      amount: cents(5000),
      nature: 'balance_adjustment',
    });

    expect(() =>
      Transaction.linkTransfer(
        out,
        adjustment,
        { secondHasInvoiceLink: false, secondIsCardAccount: false },
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_NATURE_LOCKED' }));
  });
});

describe('Transaction.assignCategory', () => {
  it("sets the category as the user's and drops the rule that had set it", () => {
    const transaction = buildTestTransaction({
      categoryId: 'old',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
    });
    transaction.assignCategory(FOOD, LATER);

    expect(transaction).toMatchObject({
      categoryId: 'food',
      categorySource: 'user',
      categoryRuleId: null,
    });
  });

  it('clears with null', () => {
    const transaction = buildTestTransaction({ categoryId: 'food', categorySource: 'user' });
    transaction.assignCategory(null, LATER);

    expect(transaction).toMatchObject({ categoryId: null, categorySource: null });
  });

  it('only fits the nature of the transaction and an active category', () => {
    expect(() => buildTestTransaction().assignCategory(SALARY, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }),
    );
    expect(() =>
      buildTestTransaction().assignCategory({ ...FOOD, isArchived: true }, LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }));
    expect(() => buildTestTransaction({ nature: 'transfer' }).assignCategory(FOOD, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_CATEGORY_NOT_ALLOWED' }),
    );
  });

  it('lives on the parts of a split transaction, not on it', () => {
    const transaction = buildTestTransaction();
    transaction.splitInto([split(1000), split(250)], TEST_NOW);

    expect(() => transaction.assignCategory(FOOD, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }),
    );
    expect(() => transaction.assignCategory(null, LATER)).not.toThrow();
  });
});

const foodTag = (id: string, isArchived = false) => ({ id, categoryId: 'food', isArchived });
const marketTag = (id: string) => ({ id, categoryId: 'market', isArchived: false });

describe('Transaction tags', () => {
  const inFood = (tagIds: string[] = []) =>
    buildTestTransaction({ categoryId: 'food', categorySource: 'user', tagIds });

  it('replaces the set and lets an archived tag stay when it was already there', () => {
    const transaction = inFood(['old']);
    transaction.replaceTags([foodTag('old', true), foodTag('new')], LATER);

    expect(transaction.tagIds).toEqual(['old', 'new']);
    expect(() => transaction.replaceTags([foodTag('other', true)], LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_ARCHIVED' }),
    );
  });

  it('adds one tag and keeps the others, saying whether it changed', () => {
    const transaction = inFood(['a']);

    expect(transaction.addTag(foodTag('b'), LATER)).toBe(true);
    expect(transaction.addTag(foodTag('a'), LATER)).toBe(false);
    expect(transaction.tagIds).toEqual(['a', 'b']);
    expect(() => transaction.addTag(foodTag('c', true), LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_ARCHIVED' }),
    );
  });

  it('only takes tags of its own category: another category is refused with its own code', () => {
    const transaction = inFood(['a']);

    expect(() => transaction.replaceTags([foodTag('a'), marketTag('m')], LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }),
    );
    expect(() => transaction.addTag(marketTag('m'), LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }),
    );
    expect(transaction.tagIds).toEqual(['a']);
  });

  it('takes no tag at all while it has no category, and can still clear them', () => {
    const transaction = buildTestTransaction();

    expect(() => transaction.replaceTags([foodTag('a')], LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
    expect(() => transaction.addTag(foodTag('a'), LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
    expect(() => transaction.replaceTags([], LATER)).not.toThrow();
  });

  it('answers why a bulk tag cannot be added, without changing anything', () => {
    const transaction = inFood();

    expect(transaction.whyCannotTakeTag(foodTag('a'))).toBeNull();
    expect(transaction.whyCannotTakeTag(marketTag('m'))).toBe('tag_category_mismatch');
    expect(buildTestTransaction().whyCannotTakeTag(foodTag('a'))).toBe('tag_category_mismatch');
    expect(transaction.tagIds).toEqual([]);
  });

  it('loses its tags when the category changes, and keeps them when it is the same', () => {
    const transaction = inFood(['a', 'b']);

    transaction.assignCategory(FOOD, LATER);
    expect(transaction.tagIds).toEqual(['a', 'b']);

    transaction.assignCategory({ id: 'market', kind: 'expense', isArchived: false }, LATER);
    expect(transaction).toMatchObject({ categoryId: 'market', tagIds: [] });
  });

  it('loses its tags when the category is cleared, the nature leaves the counted ones or it is split', () => {
    const cleared = inFood(['a']);
    cleared.assignCategory(null, LATER);
    expect(cleared.tagIds).toEqual([]);

    const transfer = inFood(['a']);
    transfer.changeNature('transfer', { hasActiveInvoiceLink: false, isCardAccount: false }, LATER);
    expect(transfer.tagIds).toEqual([]);

    const unsplit = inFood(['a']);
    unsplit.splitInto([split(1000, FOOD), split(250)], LATER, [foodTag('a')]);
    unsplit.unsplit(LATER);
    expect(unsplit.tagIds).toEqual([]);
  });
});

// A split transaction has no category of its own: its tags are the ones of the categories of its
// parts (decision of 09/11/2026), and nothing else changes where the tag lives (the transaction).
describe('Transaction tags of a split transaction', () => {
  const MARKET = { id: 'market', kind: 'expense', isArchived: false } as const;
  const inFood = (tagIds: string[] = []) =>
    buildTestTransaction({ categoryId: 'food', categorySource: 'user', tagIds });

  it('keeps the tags of the categories a part kept and drops the others when it splits', () => {
    const transaction = inFood(['a']);
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER, [foodTag('a')]);
    expect(transaction.tagIds).toEqual(['a']);

    const lost = inFood(['a']);
    lost.splitInto([split(1000, MARKET), split(250)], LATER, [foodTag('a')]);
    expect(lost.tagIds).toEqual([]);

    const noPart = inFood(['a']);
    noPart.splitInto([split(1000), split(250)], LATER, [foodTag('a')]);
    expect(noPart.tagIds).toEqual([]);
  });

  it('redoing the split keeps only the tags of the categories the new parts have', () => {
    const transaction = inFood(['a']);
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER, [foodTag('a')]);
    transaction.replaceTags([foodTag('a'), marketTag('m')], LATER);

    transaction.splitInto([split(600, MARKET), split(650, MARKET)], LATER, [
      foodTag('a'),
      marketTag('m'),
    ]);

    expect(transaction.tagIds).toEqual(['m']);
  });

  it('takes the tags of the categories of any part, and refuses the ones of another category', () => {
    const transaction = inFood();
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER);

    transaction.replaceTags([foodTag('a'), marketTag('m')], LATER);
    expect(transaction.tagIds).toEqual(['a', 'm']);
    expect(transaction.addTag({ id: 'x', categoryId: 'market', isArchived: false }, LATER)).toBe(
      true,
    );
    expect(() =>
      transaction.replaceTags([{ id: 'z', categoryId: 'other', isArchived: false }], LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_TAG_CATEGORY_MISMATCH' }));
    expect(transaction.whyCannotTakeTag(marketTag('m'))).toBeNull();
    expect(transaction.whyCannotTakeTag({ id: 'z', categoryId: 'other', isArchived: false })).toBe(
      'tag_category_mismatch',
    );
  });

  it('a split with no category on any part takes no tag', () => {
    const transaction = inFood();
    transaction.splitInto([split(1000), split(250)], LATER);

    expect(() => transaction.replaceTags([foodTag('a')], LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_TAG_NEEDS_CATEGORY' }),
    );
  });

  it('clearing the category of a split one changes nothing: its tags stay', () => {
    const transaction = inFood();
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER);
    transaction.replaceTags([foodTag('a'), marketTag('m')], LATER);

    transaction.assignCategory(null, LATER);

    expect(transaction.tagIds).toEqual(['a', 'm']);
  });

  it('restores a state of a split one with the tags its parts justify', () => {
    const transaction = inFood();
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER);
    transaction.replaceTags([foodTag('a'), marketTag('m')], LATER);
    const before = transaction.previousState();

    transaction.ignore(LATER);
    transaction.restoreState(before, { ruleStillExists: false }, LATER);

    expect(transaction.tagIds).toEqual(['a', 'm']);
    expect(transaction.ignoredAt).toBeNull();
  });

  it('undoing the split leaves no category, so no tag', () => {
    const transaction = inFood();
    transaction.splitInto([split(1000, FOOD), split(250, MARKET)], LATER);
    transaction.replaceTags([foodTag('a'), marketTag('m')], LATER);

    transaction.unsplit(LATER);

    expect(transaction.tagIds).toEqual([]);
  });
});

describe('ignore, unignore and delete', () => {
  it('ignores once and undoes once', () => {
    const transaction = buildTestTransaction();
    transaction.ignore(LATER);

    expect(transaction.ignoredAt).toBe(LATER);
    expect(() => transaction.ignore(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_ALREADY_IGNORED' }),
    );

    transaction.unignore(LATER);
    expect(transaction.ignoredAt).toBe(null);
    expect(() => transaction.unignore(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NOT_IGNORED' }),
    );
  });

  it('deletes only the manual one that is not a parcel', () => {
    expect(() => buildTestTransaction().assertDeletable()).not.toThrow();
    expect(() => buildTestBankTransaction().assertDeletable()).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NOT_MANUAL' }),
    );
    expect(() =>
      buildTestTransaction({ installment: { planId: 'p', number: 1 } }).assertDeletable(),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_IS_INSTALLMENT' }));
  });
});

describe('Transaction.splitInto (a divisão soma o total)', () => {
  it('splits an expense in two parts with the sign and the nature of the transaction', () => {
    const transaction = buildTestTransaction({ categoryId: 'food', categorySource: 'user' });
    transaction.splitInto(
      [split(1000, FOOD), { amount: cents(250), category: null, description: 'Metade da Júlia' }],
      LATER,
    );

    expect(
      transaction.splits.map((part) => [part.position, part.amount.cents, part.nature]),
    ).toEqual([
      [1, -1000, 'expense'],
      [2, -250, 'expense'],
    ]);
    expect(transaction.splits[0]?.categoryId).toBe('food');
    expect(transaction.splits[1]?.description).toBe('Metade da Júlia');
    expect(transaction.categoryId).toBe(null);
    expect(transaction.categorySource).toBe(null);
  });

  it('always adds up to the amount of the transaction', () => {
    for (const total of [1, 2, 99, 1250, 100_000_01]) {
      for (const first of [1, Math.max(1, Math.floor(total / 3))]) {
        if (first >= total) continue;
        const transaction = buildTestTransaction({ amount: cents(-total) });
        transaction.splitInto([split(first), split(total - first)], LATER);

        expect(transaction.splits.reduce((sum, part) => sum + part.amount.cents, 0)).toBe(-total);
      }
    }
  });

  it('refuses a sum that differs, in either direction', () => {
    for (const parts of [
      [1000, 249],
      [1000, 251],
    ]) {
      expect(() =>
        buildTestTransaction().splitInto(
          parts.map((part) => split(part)),
          LATER,
        ),
      ).toThrow(expect.objectContaining({ code: 'TRANSACTION_SPLIT_SUM_MISMATCH' }));
    }
  });

  it('refuses a value that is not positive in a part and a number of parts out of range', () => {
    expect(() => buildTestTransaction().splitInto([split(1250), split(0)], LATER)).toThrow(
      RangeError,
    );
    expect(() => buildTestTransaction().splitInto([split(1500), split(-250)], LATER)).toThrow(
      RangeError,
    );
    expect(() => buildTestTransaction().splitInto([split(1250)], LATER)).toThrow(RangeError);
    const eleven = Array.from({ length: 11 }, () => split(1));
    expect(() => buildTestTransaction({ amount: cents(-11) }).splitInto(eleven, LATER)).toThrow(
      RangeError,
    );
  });

  it('accepts up to ten parts', () => {
    const transaction = buildTestTransaction({ amount: cents(-10) });
    transaction.splitInto(
      Array.from({ length: 10 }, () => split(1)),
      LATER,
    );

    expect(transaction.splits).toHaveLength(10);
  });

  it('only splits expense and income', () => {
    expect(() =>
      buildTestTransaction({ nature: 'transfer' }).splitInto([split(1000), split(250)], LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_SPLIT_NOT_ALLOWED' }));
  });

  it('checks the category of each part', () => {
    expect(() =>
      buildTestTransaction().splitInto([split(1000, SALARY), split(250)], LATER),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_KIND_MISMATCH' }));
    expect(() =>
      buildTestTransaction().splitInto(
        [split(1000, { ...FOOD, isArchived: true }), split(250)],
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_CATEGORY_ARCHIVED' }));
  });

  it('is redone by a second call', () => {
    const transaction = buildTestTransaction();
    transaction.splitInto([split(1000), split(250)], LATER);
    transaction.splitInto([split(600), split(650)], LATER);

    expect(transaction.splits.map((part) => part.amount.cents)).toEqual([-600, -650]);
  });

  it('is locked while a part of a friend is tied to a debt', () => {
    const transaction = buildTestTransaction({
      splits: [
        new TransactionSplit({
          id: 's1',
          position: 1,
          amount: cents(-625),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
        new TransactionSplit({
          id: 's2',
          position: 2,
          amount: cents(-625),
          nature: 'lent',
          categoryId: null,
          description: 'Amigo',
        }),
      ],
    });

    expect(() => transaction.splitInto([split(1000), split(250)], LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_SPLIT_LINKED_TO_BILL' }),
    );
    expect(() => transaction.unsplit(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_SPLIT_LINKED_TO_BILL' }),
    );
  });

  it('undoes the split, leaving the transaction without category, once', () => {
    const transaction = buildTestTransaction();
    transaction.splitInto([split(1000), split(250)], LATER);
    transaction.unsplit(LATER);

    expect(transaction.splits).toEqual([]);
    expect(transaction.categoryId).toBe(null);
    expect(transaction.isInReview()).toBe(true);
    expect(() => transaction.unsplit(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NOT_SPLIT' }),
    );
  });
});

describe('Transaction.applyBankVersion (a edição sobrevive ao banco)', () => {
  const version = (overrides: Partial<Transaction.BankVersion> = {}): Transaction.BankVersion => ({
    description: 'PADARIA SANTA CLARA',
    amount: cents(-1250),
    occurredOn: date('2026-11-05'),
    counterparty: null,
    status: 'posted',
    ...overrides,
  });

  it('follows the bank on every field Lucas did not touch', () => {
    const transaction = buildTestBankTransaction();
    transaction.applyBankVersion(
      version({
        description: 'PADARIA SANTA CLARA LTDA',
        amount: cents(-1300),
        occurredOn: date('2026-11-06'),
      }),
      LATER,
    );

    expect(transaction.description).toBe('PADARIA SANTA CLARA LTDA');
    expect(transaction.amount.cents).toBe(-1300);
    expect(transaction.occurredOn.value).toBe('2026-11-06');
    expect(transaction.bank?.amount.cents).toBe(-1300);
    expect(transaction.bankChange).toBe(null);
    expect(transaction.isEdited()).toBe(false);
  });

  it('does not give the nature back of a card credit that Lucas made an income by category', () => {
    const credit = buildTestBankTransaction({
      accountId: 'card-1',
      method: 'credit',
      invoiceMonth: Month.of('2026-11'),
      amount: cents(1500),
      nature: 'expense',
      bank: {
        description: 'ESTORNO',
        amount: cents(1500),
        occurredOn: date('2026-11-05'),
        counterparty: null,
        status: 'posted',
      },
    });
    credit.assignCategory(SALARY, LATER, { isCardAccount: true });
    credit.applyBankVersion(
      version({ description: 'ESTORNO LOJA', amount: cents(1600), counterparty: null }),
      LATER,
    );

    expect(credit).toMatchObject({
      nature: 'income',
      natureSetBy: 'user',
      categoryId: 'salary',
      amount: cents(1600),
    });
    // And no detector of the import takes it over either: the nature is Lucas's.
    expect(credit.canTakeDetectedNature()).toBe(false);
  });

  it('keeps what Lucas changed and records the change with before and after', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1800), description: 'Café' });
    transaction.applyBankVersion(
      version({ amount: cents(-1300), description: 'PADARIA NOVA' }),
      LATER,
    );

    expect(transaction.amount.cents).toBe(-1800);
    expect(transaction.description).toBe('Café');
    expect(transaction.bank?.amount.cents).toBe(-1300);
    expect(transaction.bankChange).toEqual({
      detectedAt: LATER,
      changes: [
        { field: 'description', before: 'PADARIA SANTA CLARA', after: 'PADARIA NOVA' },
        { field: 'amountCents', before: -1250, after: -1300 },
      ],
    });
  });

  it('mixes: follows the field Lucas left alone and protects the one he edited', () => {
    const transaction = buildTestBankTransaction({ description: 'Café' });
    transaction.applyBankVersion(
      version({ description: 'OUTRO NOME', amount: cents(-1300) }),
      LATER,
    );

    expect(transaction.amount.cents).toBe(-1300);
    expect(transaction.description).toBe('Café');
    expect(transaction.bankChange?.changes.map((change) => change.field)).toEqual(['description']);
  });

  it('records nothing when the bank did not change the field', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1800) });
    transaction.applyBankVersion(version({ counterparty: 'Padaria Ltda' }), LATER);

    expect(transaction.amount.cents).toBe(-1800);
    expect(transaction.bankChange).toBe(null);
    expect(transaction.bank?.counterparty).toBe('Padaria Ltda');
  });

  it('records nothing when the bank arrives at what Lucas already has', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1300) });
    transaction.applyBankVersion(version({ amount: cents(-1300) }), LATER);

    expect(transaction.bankChange).toBe(null);
    expect(transaction.isEdited()).toBe(false);
  });

  it('keeps the first "before" when the bank changes the same field again', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1800) });
    transaction.applyBankVersion(version({ amount: cents(-1300) }), LATER);
    transaction.applyBankVersion(version({ amount: cents(-1400) }), '2026-11-08T10:00:00.000Z');

    expect(transaction.bankChange).toEqual({
      detectedAt: '2026-11-08T10:00:00.000Z',
      changes: [{ field: 'amountCents', before: -1250, after: -1400 }],
    });
  });

  it('drops the alert when the bank goes back to where it began', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1800) });
    transaction.applyBankVersion(version({ amount: cents(-1300) }), LATER);
    transaction.applyBankVersion(version({ amount: cents(-1250) }), LATER);

    expect(transaction.bankChange).toBe(null);
  });

  it('drops the alert of a field when the bank reaches what Lucas has', () => {
    const transaction = buildTestBankTransaction({ amount: cents(-1800) });
    transaction.applyBankVersion(version({ amount: cents(-1300) }), LATER);
    transaction.applyBankVersion(version({ amount: cents(-1800) }), LATER);

    expect(transaction.bankChange).toBe(null);
  });

  it('does not let the bank move the amount of a split transaction', () => {
    const transaction = buildTestBankTransaction();
    transaction.splitInto([split(1000), split(250)], LATER);
    transaction.applyBankVersion(version({ amount: cents(-1300) }), LATER);

    expect(transaction.amount.cents).toBe(-1250);
    expect(transaction.splits.reduce((sum, part) => sum + part.amount.cents, 0)).toBe(-1250);
    expect(transaction.bankChange?.changes).toEqual([
      { field: 'amountCents', before: -1250, after: -1300 },
    ]);
  });

  it('brings back a transaction the bank had removed', () => {
    const transaction = buildTestBankTransaction({ removedByBankAt: TEST_NOW });
    transaction.applyBankVersion(version(), LATER);

    expect(transaction.removedByBankAt).toBe(null);
    expect(transaction.entersAccounts()).toBe(true);
  });

  it('is only for what came from the bank', () => {
    expect(() => buildTestTransaction().applyBankVersion(version(), LATER)).toThrow(RangeError);
  });
});

describe('Transaction.markRemovedByBank', () => {
  it('takes an unedited transaction out of the accounts and keeps an edited one in', () => {
    const untouched = buildTestBankTransaction();
    const edited = buildTestBankTransaction({ amount: cents(-1800) });
    untouched.markRemovedByBank(LATER);
    edited.markRemovedByBank(LATER);

    expect(untouched.entersAccounts()).toBe(false);
    expect(edited.entersAccounts()).toBe(true);
    expect(edited.removedByBankAt).toBe(LATER);
  });

  it('keeps the first instant when it is marked again', () => {
    const transaction = buildTestBankTransaction();
    transaction.markRemovedByBank(TEST_NOW);
    transaction.markRemovedByBank(LATER);

    expect(transaction.removedByBankAt).toBe(TEST_NOW);
  });
});

describe('Transaction.restoreOriginal', () => {
  it('copies the bank version to the one in use and clears the note and the alert', () => {
    const transaction = buildTestBankTransaction({
      description: 'Café',
      amount: cents(-1800),
      occurredOn: date('2026-11-01'),
      editNote: 'errado',
      categoryId: 'food',
      tagIds: ['a'],
      bankChange: {
        detectedAt: TEST_NOW,
        changes: [{ field: 'amountCents', before: -1250, after: -1300 }],
      },
    });

    expect(transaction.restoreOriginal(LATER)).toBe(true);
    expect(transaction).toMatchObject({
      description: 'PADARIA SANTA CLARA',
      editNote: null,
      bankChange: null,
      categoryId: 'food',
      tagIds: ['a'],
    });
    expect(transaction.amount.cents).toBe(-1250);
    expect(transaction.occurredOn.value).toBe('2026-11-05');
    expect(transaction.isEdited()).toBe(false);
  });

  it('is idempotent', () => {
    const transaction = buildTestBankTransaction();

    expect(transaction.restoreOriginal(LATER)).toBe(false);
    expect(transaction.updatedAt).toBe(TEST_NOW);
  });

  it('refuses a manual transaction', () => {
    expect(() => buildTestTransaction().restoreOriginal(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NOT_FROM_BANK' }),
    );
  });

  it('refuses when the split would stop adding up, and allows it when the value is the same', () => {
    const edited = buildTestBankTransaction();
    edited.splitInto([split(1000), split(250)], LATER);
    edited.amount = cents(-1250);
    edited.description = 'Café';

    expect(() => edited.restoreOriginal(LATER)).not.toThrow();

    const different = buildTestBankTransaction();
    different.splitInto([split(1000), split(250)], LATER);
    different.bank = { ...different.bank!, amount: cents(-1300) };

    expect(() => different.restoreOriginal(LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }),
    );
  });
});

describe('Transaction.resolveBankChange', () => {
  const pending = (): Transaction =>
    buildTestBankTransaction({
      description: 'Café',
      amount: cents(-1800),
      bank: {
        description: 'PADARIA SANTA CLARA',
        amount: cents(-1300),
        occurredOn: date('2026-11-05'),
        counterparty: null,
        status: 'posted',
      },
      bankChange: {
        detectedAt: TEST_NOW,
        changes: [{ field: 'amountCents', before: -1250, after: -1300 }],
      },
    });

  it('uses the bank value on the changed fields and keeps the other edits', () => {
    const transaction = pending();
    transaction.resolveBankChange('bank', LATER);

    expect(transaction.amount.cents).toBe(-1300);
    expect(transaction.description).toBe('Café');
    expect(transaction.bankChange).toBe(null);
  });

  it('keeps Lucas version and clears the alert', () => {
    const transaction = pending();
    transaction.resolveBankChange('mine', LATER);

    expect(transaction.amount.cents).toBe(-1800);
    expect(transaction.bankChange).toBe(null);
  });

  it('has nothing to resolve without a change nor a removal', () => {
    expect(() => buildTestBankTransaction().resolveBankChange('bank', LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NO_BANK_CHANGE' }),
    );
    expect(() => buildTestTransaction().resolveBankChange('mine', LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_NO_BANK_CHANGE' }),
    );
  });

  it('refuses the bank value of an amount on a split transaction', () => {
    const transaction = pending();
    transaction.amount = cents(-1250);
    transaction.description = 'PADARIA SANTA CLARA';
    transaction.bank = { ...transaction.bank!, amount: cents(-1300) };
    transaction.splitInto([split(1000), split(250)], LATER);

    expect(() => transaction.resolveBankChange('bank', LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_IS_SPLIT' }),
    );
    expect(() => transaction.resolveBankChange('mine', LATER)).not.toThrow();
  });

  describe('when the bank removed an edited transaction (N14)', () => {
    const removed = () =>
      buildTestBankTransaction({
        description: 'Café',
        removedByBankAt: TEST_NOW,
      });

    it('lets it stay with "mine"', () => {
      const transaction = removed();
      transaction.resolveBankChange('mine', LATER);

      expect(transaction.removedByBankAt).toBe(null);
      expect(transaction.entersAccounts()).toBe(true);
      expect(transaction.description).toBe('Café');
    });

    it('accepts the removal with "bank": back to the bank version, out of the accounts', () => {
      const transaction = removed();
      transaction.resolveBankChange('bank', LATER);

      expect(transaction.description).toBe('PADARIA SANTA CLARA');
      expect(transaction.isEdited()).toBe(false);
      expect(transaction.entersAccounts()).toBe(false);
    });
  });
});

describe('previous state of a bulk action', () => {
  it('drops the saved category when the nature stopped counting or it was split, instead of breaking', () => {
    const state = {
      transactionId: 'x',
      categoryId: 'food',
      categorySource: 'user' as const,
      categoryRuleId: null,
      tagIds: [],
      ignoredAt: null,
    };
    const transfer = buildTestTransaction({ nature: 'transfer' });
    const divided = buildTestTransaction();
    divided.splitInto([split(1000), split(250)], TEST_NOW);
    for (const transaction of [transfer, divided]) {
      transaction.restoreState(state, { ruleStillExists: true }, LATER);

      expect(transaction).toMatchObject({
        categoryId: null,
        categorySource: null,
        categoryRuleId: null,
      });
    }
  });

  it('captures category, tags and ignore, and writes them back', () => {
    const transaction = buildTestTransaction({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
      tagIds: ['a'],
    });
    const before = transaction.previousState();
    transaction.assignCategory(null, LATER);
    transaction.replaceTags([], LATER);
    transaction.ignore(LATER);
    transaction.restoreState(before, { ruleStillExists: true }, LATER);

    expect(transaction).toMatchObject({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
      tagIds: ['a'],
      ignoredAt: null,
    });
  });

  it('drops the saved tags together with a category that cannot be restored', () => {
    const transfer = buildTestTransaction({ nature: 'transfer' });

    transfer.restoreState(
      {
        transactionId: transfer.id,
        categoryId: 'food',
        categorySource: 'user',
        categoryRuleId: null,
        tagIds: ['a'],
        ignoredAt: null,
      },
      { ruleStillExists: true },
      LATER,
    );

    expect(transfer.tagIds).toEqual([]);
  });

  it('leaves no id of a rule that was deleted meanwhile', () => {
    const transaction = buildTestTransaction();
    transaction.restoreState(
      {
        transactionId: transaction.id,
        categoryId: 'food',
        categorySource: 'rule',
        categoryRuleId: 'gone',
        tagIds: [],
        ignoredAt: null,
      },
      { ruleStillExists: false },
      LATER,
    );

    expect(transaction).toMatchObject({ categoryId: 'food', categoryRuleId: null });
  });
});

describe('Transaction.applyRule (BR-CAT-006)', () => {
  const RULE = { id: 'rule-1', category: FOOD, tagIds: ['trip'] };
  const NONE: ReadonlySet<string> = new Set();

  it('sets the category as the rule did, drops the tags of the old category and adds the tags of the rule', () => {
    const transaction = buildTestTransaction({ tagIds: ['mine'] });

    const changed = transaction.applyRule(RULE, NONE, LATER);

    expect(changed).toBe(true);
    expect(transaction).toMatchObject({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
      tagIds: ['trip'],
      updatedAt: LATER,
    });
  });

  it('answers false and touches nothing when there is nothing to change', () => {
    const transaction = buildTestTransaction({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-0',
      tagIds: ['trip'],
    });

    expect(transaction.applyRule(RULE, NONE, LATER)).toBe(false);
    expect(transaction).toMatchObject({ categoryRuleId: 'rule-0', updatedAt: TEST_NOW });
  });

  it('never overwrites a category that Lucas, a recurrence or a bill put, and adds nothing then', () => {
    for (const source of ['user', 'recurrence', 'bill'] as const) {
      const transaction = buildTestTransaction({ categoryId: 'market', categorySource: source });

      expect(transaction.applyRule(RULE, NONE, LATER)).toBe(false);
      expect(transaction).toMatchObject({
        categoryId: 'market',
        categorySource: source,
        tagIds: [],
      });
    }
  });

  it('keeps what an older rule categorized, and takes over from a younger one', () => {
    const owned = (ruleId: string) =>
      buildTestTransaction({
        categoryId: 'market',
        categorySource: 'rule',
        categoryRuleId: ruleId,
      });

    expect(owned('older').applyRule(RULE, new Set(['older']), LATER)).toBe(false);
    const taken = owned('younger');
    expect(taken.applyRule(RULE, new Set(['older']), LATER)).toBe(true);
    expect(taken).toMatchObject({ categoryId: 'food', categoryRuleId: 'rule-1' });
  });

  it('does not touch a split, an ignored, an outside-the-month nature or the other kind', () => {
    const split = buildTestTransaction({
      splits: [
        new TransactionSplit({
          id: 'part-1',
          position: 1,
          amount: cents(-1000),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
        new TransactionSplit({
          id: 'part-2',
          position: 2,
          amount: cents(-250),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
      ],
    });
    const cases = [
      split,
      buildTestTransaction({ ignoredAt: TEST_NOW }),
      buildTestTransaction({ nature: 'transfer' }),
      buildTestTransaction({ nature: 'income', amount: cents(1250) }),
    ];

    for (const transaction of cases) {
      expect(transaction.applyRule(RULE, NONE, LATER)).toBe(false);
      expect(transaction.categoryId).toBeNull();
      expect(transaction.tagIds).toEqual([]);
    }
  });

  it('adds the tags of the rule to a transaction that already has its category, and keeps the other tags of it', () => {
    const same = buildTestTransaction({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
      tagIds: ['mine'],
    });

    expect(same.applyRule(RULE, NONE, LATER)).toBe(true);
    expect(same.tagIds).toEqual(['mine', 'trip']);
  });

  it('adds no tag when it does not put the category: a rule with no category, or one that an older rule blocks', () => {
    const free = buildTestTransaction({ categoryId: 'market', categorySource: 'rule' });
    expect(free.applyRule({ id: 'rule-2', category: null, tagIds: ['trip'] }, NONE, LATER)).toBe(
      false,
    );
    expect(free.tagIds).toEqual([]);

    const blocked = buildTestTransaction({
      categoryId: 'market',
      categorySource: 'rule',
      categoryRuleId: 'older',
    });
    expect(blocked.applyRule(RULE, new Set(['older']), LATER)).toBe(false);
    expect(blocked.tagIds).toEqual([]);

    for (const source of ['user', 'recurrence', 'bill'] as const) {
      const byHand = buildTestTransaction({ categoryId: 'market', categorySource: source });

      expect(
        byHand.applyRule({ id: 'rule-2', category: null, tagIds: ['trip'] }, NONE, LATER),
      ).toBe(false);
      expect(byHand.tagIds).toEqual([]);
    }
  });
});

describe('Transaction.markAsInvoicePayment', () => {
  it('turns an expense into an invoice payment chosen by the user, clearing the category', () => {
    const transaction = buildTestTransaction({
      categoryId: 'food',
      categorySource: 'rule',
      categoryRuleId: 'rule-1',
    });

    transaction.markAsInvoicePayment(LATER);

    expect(transaction).toMatchObject({
      nature: 'invoice_payment',
      natureSetBy: 'user',
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      updatedAt: LATER,
    });
  });

  it('turns an income into an invoice payment too', () => {
    const transaction = buildTestTransaction({
      nature: 'income',
      amount: cents(5000),
      natureSetBy: 'system',
    });

    transaction.markAsInvoicePayment(LATER);

    expect(transaction).toMatchObject({ nature: 'invoice_payment', natureSetBy: 'user' });
  });

  it('changes nothing in one the system already marked as invoice payment', () => {
    const transaction = buildTestTransaction({
      nature: 'invoice_payment',
      natureSetBy: 'system',
    });

    transaction.markAsInvoicePayment(LATER);

    expect(transaction).toMatchObject({
      nature: 'invoice_payment',
      natureSetBy: 'system',
      updatedAt: TEST_NOW,
    });
  });

  it('refuses a split transaction', () => {
    const transaction = buildTestTransaction({
      splits: [
        new TransactionSplit({
          id: 's1',
          position: 1,
          amount: cents(-625),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
        new TransactionSplit({
          id: 's2',
          position: 2,
          amount: cents(-625),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
      ],
    });

    expect(() => transaction.markAsInvoicePayment(LATER)).toThrow(TransactionIsSplitError);
    expect(transaction.nature).toBe('expense');
  });

  it.each(['transfer', 'lent', 'reimbursed', 'balance_adjustment'] as const)(
    'refuses the nature %s',
    (nature) => {
      const transaction = buildTestTransaction({ nature });

      expect(() => transaction.markAsInvoicePayment(LATER)).toThrow(TransactionNatureLockedError);
      expect(transaction.nature).toBe(nature);
      expect(transaction.updatedAt).toBe(TEST_NOW);
    },
  );
});

describe('Transaction.releaseFromInvoicePayment', () => {
  it('gives an expense back to a negative payment chosen by the user, now decided by the system', () => {
    const transaction = buildTestTransaction({
      nature: 'invoice_payment',
      natureSetBy: 'user',
      amount: cents(-5000),
    });

    transaction.releaseFromInvoicePayment({ isCardAccount: false }, LATER);

    expect(transaction).toMatchObject({
      nature: 'expense',
      natureSetBy: 'system',
      updatedAt: LATER,
    });
  });

  it('gives an income back to a positive payment in a common account', () => {
    const transaction = buildTestTransaction({
      nature: 'invoice_payment',
      natureSetBy: 'user',
      amount: cents(5000),
    });

    transaction.releaseFromInvoicePayment({ isCardAccount: false }, LATER);

    expect(transaction).toMatchObject({ nature: 'income', natureSetBy: 'system' });
  });

  it('gives an expense back to a positive payment on a card (a credit on a card is no income)', () => {
    const transaction = buildTestTransaction({
      accountId: 'card-1',
      nature: 'invoice_payment',
      natureSetBy: 'user',
      amount: cents(5000),
    });

    transaction.releaseFromInvoicePayment({ isCardAccount: true }, LATER);

    expect(transaction).toMatchObject({ nature: 'expense', natureSetBy: 'system' });
  });

  it('changes nothing in one the system marked as invoice payment', () => {
    const transaction = buildTestTransaction({
      nature: 'invoice_payment',
      natureSetBy: 'system',
      amount: cents(-5000),
    });

    transaction.releaseFromInvoicePayment({ isCardAccount: false }, LATER);

    expect(transaction).toMatchObject({
      nature: 'invoice_payment',
      natureSetBy: 'system',
      updatedAt: TEST_NOW,
    });
  });

  it.each(['expense', 'income', 'transfer', 'lent', 'reimbursed', 'balance_adjustment'] as const)(
    'changes nothing in a transaction of nature %s',
    (nature) => {
      const transaction = buildTestTransaction({ nature, natureSetBy: 'user' });

      transaction.releaseFromInvoicePayment({ isCardAccount: false }, LATER);

      expect(transaction).toMatchObject({ nature, natureSetBy: 'user', updatedAt: TEST_NOW });
    },
  );
});

describe('Transaction.applyRecurrenceCategory (the transaction settles an occurrence, RF-REC-004)', () => {
  it('takes the category of the recurrence when it has none, with the origin recurrence', () => {
    const transaction = buildTestTransaction();

    expect(transaction.applyRecurrenceCategory(FOOD, LATER)).toBe(true);

    expect(transaction).toMatchObject({
      categoryId: 'food',
      categorySource: 'recurrence',
      categoryRuleId: null,
      updatedAt: LATER,
    });
    expect(transaction.isInReview()).toBe(false);
  });

  it('takes the category of an income recurrence on an income', () => {
    const transaction = buildTestTransaction({ nature: 'income', amount: cents(5000) });

    expect(transaction.applyRecurrenceCategory(SALARY, LATER)).toBe(true);
    expect(transaction.categoryId).toBe('salary');
  });

  it.each([
    ['one chosen by Lucas', { categoryId: 'mine', categorySource: 'user' }],
    ['one put by a rule', { categoryId: 'ruled', categorySource: 'rule', categoryRuleId: 'r1' }],
    ['one put by a bill', { categoryId: 'billed', categorySource: 'bill' }],
  ] as const)('never replaces a category that is already there: %s', (_name, attributes) => {
    const transaction = buildTestTransaction(attributes);

    expect(transaction.applyRecurrenceCategory(FOOD, LATER)).toBe(false);

    expect(transaction).toMatchObject(attributes);
    expect(transaction.updatedAt).toBe(TEST_NOW);
  });

  it('does not touch a split transaction', () => {
    const transaction = buildTestTransaction({
      splits: [
        new TransactionSplit({
          id: 's1',
          position: 1,
          amount: cents(-600),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
        new TransactionSplit({
          id: 's2',
          position: 2,
          amount: cents(-650),
          nature: 'expense',
          categoryId: null,
          description: null,
        }),
      ],
    });

    expect(transaction.applyRecurrenceCategory(FOOD, LATER)).toBe(false);
    expect(transaction.categoryId).toBeNull();
  });

  it('does not touch a transaction outside expense and income, or a category of the other kind or archived', () => {
    const transfer = buildTestTransaction({ nature: 'transfer' });
    const expense = buildTestTransaction();

    expect(transfer.applyRecurrenceCategory(FOOD, LATER)).toBe(false);
    expect(expense.applyRecurrenceCategory(SALARY, LATER)).toBe(false);
    expect(expense.applyRecurrenceCategory({ ...FOOD, isArchived: true }, LATER)).toBe(false);
    expect(expense.categoryId).toBeNull();
  });
});

describe('Transaction.changeNature of a transaction tied to an occurrence', () => {
  const free = { hasActiveInvoiceLink: false, isCardAccount: false } as const;
  const tied = { ...free, hasActiveOccurrenceLink: true } as const;

  it('refuses any other nature while the link stands', () => {
    const expense = buildTestTransaction();
    const income = buildTestTransaction({ nature: 'income', amount: cents(5000) });

    expect(() => expense.changeNature('transfer', tied, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }),
    );
    expect(() => income.changeNature('transfer', tied, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }),
    );
    expect(expense.nature).toBe('expense');
    expect(income.nature).toBe('income');
  });

  it('accepts the nature it already has, and any change when there is no link', () => {
    const expense = buildTestTransaction();

    expect(() => expense.changeNature('expense', tied, LATER)).not.toThrow();
    expect(() => expense.changeNature('transfer', free, LATER)).not.toThrow();
    expect(expense.nature).toBe('transfer');
  });

  it('refuses a linked transaction as the second leg of a transfer', () => {
    const first = buildTestTransaction({ accountId: 'a', nature: 'transfer' });
    const second = buildTestTransaction({ accountId: 'b', amount: cents(1250), nature: 'income' });

    expect(() =>
      Transaction.linkTransfer(
        first,
        second,
        { secondHasInvoiceLink: false, secondHasOccurrenceLink: true, secondIsCardAccount: false },
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_OCCURRENCE' }));
  });
});

describe('Transaction.changeNature of a transaction that pays a bill', () => {
  const free = { hasActiveInvoiceLink: false, isCardAccount: false } as const;
  const tied = { ...free, hasActiveBillLink: true } as const;

  it('refuses any other nature while the link stands', () => {
    const expense = buildTestTransaction();
    const income = buildTestTransaction({ nature: 'income', amount: cents(5000) });

    expect(() => expense.changeNature('transfer', tied, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }),
    );
    expect(() => income.changeNature('transfer', tied, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }),
    );
    expect(expense.nature).toBe('expense');
    expect(income.nature).toBe('income');
  });

  it('accepts the nature it already has, and any change when there is no link', () => {
    const expense = buildTestTransaction();

    expect(() => expense.changeNature('expense', tied, LATER)).not.toThrow();
    expect(() => expense.changeNature('transfer', free, LATER)).not.toThrow();
    expect(expense.nature).toBe('transfer');
  });

  it('refuses a linked transaction as the second leg of a transfer', () => {
    const first = buildTestTransaction({ accountId: 'a', nature: 'transfer' });
    const second = buildTestTransaction({ accountId: 'b', amount: cents(1250), nature: 'income' });

    expect(() =>
      Transaction.linkTransfer(
        first,
        second,
        { secondHasInvoiceLink: false, secondHasBillLink: true, secondIsCardAccount: false },
        LATER,
      ),
    ).toThrow(expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }));
  });
});

describe('Transaction.edit of the whole origin of a debt', () => {
  it('refuses a new value while it is lent, and keeps the other edits', () => {
    const lent = buildTestTransaction({ nature: 'lent', amount: cents(-5000) });

    expect(() => lent.edit({ amount: cents(3000) }, LATER)).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_LINKED_TO_BILL' }),
    );
    expect(lent.amount.cents).toBe(-5000);
    expect(() => lent.edit({ editNote: 'nota' }, LATER)).not.toThrow();
  });

  it('a plain expense takes the new value', () => {
    const expense = buildTestTransaction();

    expense.edit({ amount: cents(3000) }, LATER);

    expect(Math.abs(expense.amount.cents)).toBe(3000);
  });
});
