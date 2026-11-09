import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import { TRANSACTION_SPLIT_LIMITS } from '@fincheck/shared/transactions/transaction/transaction.constant.ts';
import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Transaction as TransactionContract } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import { canRuleSetCategory } from '#/modules/transactions/domain/transaction/can-rule-set-category.util.ts';
import { computeCompetenceOn } from '#/modules/transactions/domain/transaction/compute-competence-on.util.ts';
import { TransactionAccountArchivedError } from '#/modules/transactions/domain/transaction/transaction-account-archived.error.ts';
import { TransactionAlreadyIgnoredError } from '#/modules/transactions/domain/transaction/transaction-already-ignored.error.ts';
import { TransactionCategoryArchivedError } from '#/modules/transactions/domain/transaction/transaction-category-archived.error.ts';
import { TransactionCategoryKindMismatchError } from '#/modules/transactions/domain/transaction/transaction-category-kind-mismatch.error.ts';
import { TransactionCategoryNotAllowedError } from '#/modules/transactions/domain/transaction/transaction-category-not-allowed.error.ts';
import { TransactionIsInstallmentError } from '#/modules/transactions/domain/transaction/transaction-is-installment.error.ts';
import { TransactionIsSplitError } from '#/modules/transactions/domain/transaction/transaction-is-split.error.ts';
import { TransactionLinkedToBillError } from '#/modules/transactions/domain/transaction/transaction-linked-to-bill.error.ts';
import { TransactionLinkedToOccurrenceError } from '#/modules/transactions/domain/transaction/transaction-linked-to-occurrence.error.ts';
import { TransactionMethodAccountMismatchError } from '#/modules/transactions/domain/transaction/transaction-method-account-mismatch.error.ts';
import { TransactionNatureLockedError } from '#/modules/transactions/domain/transaction/transaction-nature-locked.error.ts';
import { TransactionNatureSignMismatchError } from '#/modules/transactions/domain/transaction/transaction-nature-sign-mismatch.error.ts';
import { TransactionNoBankChangeError } from '#/modules/transactions/domain/transaction/transaction-no-bank-change.error.ts';
import { TransactionNotFromBankError } from '#/modules/transactions/domain/transaction/transaction-not-from-bank.error.ts';
import { TransactionNotIgnoredError } from '#/modules/transactions/domain/transaction/transaction-not-ignored.error.ts';
import { TransactionNotManualError } from '#/modules/transactions/domain/transaction/transaction-not-manual.error.ts';
import { TransactionNotSplitError } from '#/modules/transactions/domain/transaction/transaction-not-split.error.ts';
import { TransactionSplitLinkedToBillError } from '#/modules/transactions/domain/transaction/transaction-split-linked-to-bill.error.ts';
import { TransactionSplitNotAllowedError } from '#/modules/transactions/domain/transaction/transaction-split-not-allowed.error.ts';
import { TransactionSplitSumMismatchError } from '#/modules/transactions/domain/transaction/transaction-split-sum-mismatch.error.ts';
import { TransactionTagArchivedError } from '#/modules/transactions/domain/transaction/transaction-tag-archived.error.ts';
import { TransactionSplit } from '#/modules/transactions/domain/transaction/transaction-split.value-object.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { DomainError } from '#/shared/errors/domain.error.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import { Money } from '#/shared/money/money.value-object.ts';

// The root of the aggregate: one entry in an account (or card), with the two versions of it (the
// bank's original and the one in use), the split into parts and the tags. Every rule that decides
// what counts, what survives a synchronization and what may change lives here; the use cases only
// load, call and save. The amount carries the point of view of Lucas: negative leaves the account
// (or enters the card debt), positive enters.
export class Transaction {
  readonly id: string;
  readonly accountId: string;
  readonly origin: TransactionContract.Origin;
  nature: TransactionContract.Nature;
  natureSetBy: 'system' | 'user';
  readonly method: TransactionContract.Method;
  description: string;
  amount: Money;
  occurredOn: BusinessDate;
  // The invoice the purchase falls in. Only a card has it. Stored: it is the bank's assignment.
  invoiceMonth: Month | null;
  // The last original the bank sent. Null on a manual transaction.
  bank: Transaction.BankVersion | null;
  // What the bank changed after Lucas edited the field, waiting for his answer (RF-TRX-007).
  bankChange: Transaction.BankChange | null;
  removedByBankAt: string | null;
  ignoredAt: string | null;
  categoryId: string | null;
  categorySource: TransactionContract.CategorySource | null;
  categoryRuleId: string | null;
  editNote: string | null;
  installment: Transaction.Installment | null;
  transferCounterpartId: string | null;
  splits: TransactionSplit[];
  tagIds: string[];
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Transaction.Attributes) {
    this.id = attr.id ?? generateId();
    this.accountId = attr.accountId;
    this.origin = attr.origin;
    this.nature = attr.nature;
    this.natureSetBy = attr.natureSetBy;
    this.method = attr.method;
    this.description = attr.description;
    this.amount = attr.amount;
    this.occurredOn = attr.occurredOn;
    this.invoiceMonth = attr.invoiceMonth;
    this.bank = attr.bank;
    this.bankChange = attr.bankChange;
    this.removedByBankAt = attr.removedByBankAt;
    this.ignoredAt = attr.ignoredAt;
    this.categoryId = attr.categoryId;
    this.categorySource = attr.categorySource;
    this.categoryRuleId = attr.categoryRuleId;
    this.editNote = attr.editNote;
    this.installment = attr.installment;
    this.transferCounterpartId = attr.transferCounterpartId;
    this.splits = attr.splits;
    this.tagIds = attr.tagIds;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // "Nova transação" (RF-TRX-001): a manual expense or income. `amount` is the positive value the
  // form sends; the sign comes from the type.
  static createManual(input: Transaction.CreateManualInput, now: string): Transaction {
    if (input.account.isArchived) throw new TransactionAccountArchivedError();
    if (input.amount.cents <= 0)
      throw new RangeError('The amount of a new transaction is positive');
    if ((input.method === 'credit') !== input.account.isCard) {
      throw new TransactionMethodAccountMismatchError();
    }
    if (input.type === 'income' && input.account.isCard) {
      throw new RequestValidationError([
        { path: 'type', message: 'Crédito no cartão nunca é receita.' },
      ]);
    }
    if (input.account.isCard !== (input.invoiceMonth !== null)) {
      throw new RangeError('Only a card purchase has an invoice month');
    }

    const transaction = new Transaction({
      accountId: input.account.id,
      origin: 'manual',
      nature: input.type,
      natureSetBy: 'user',
      method: input.method,
      description: input.description,
      amount: input.type === 'expense' ? input.amount.negate() : input.amount,
      occurredOn: input.occurredOn,
      invoiceMonth: input.invoiceMonth,
      bank: null,
      bankChange: null,
      removedByBankAt: null,
      ignoredAt: null,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      editNote: null,
      installment: null,
      transferCounterpartId: null,
      splits: [],
      tagIds: [],
      createdAt: now,
    });
    transaction.assignCategory(input.category, now, { isCardAccount: input.account.isCard });
    transaction.replaceTags(input.tags, now);

    return transaction;
  }

  // The parcel `number` of a purchase in installments entered by hand: a card expense on the
  // invoice of its month. `amount` is positive. The date is the day of the purchase in the month of the
  // parcel, so the two dates coincide on a manual plan.
  static createInstallmentParcel(input: Transaction.CreateParcelInput, now: string): Transaction {
    if (input.amount.cents <= 0) throw new RangeError('The amount of a parcel is positive');

    const transaction = new Transaction({
      accountId: input.accountId,
      origin: 'manual',
      nature: 'expense',
      natureSetBy: 'user',
      method: 'credit',
      description: input.description,
      amount: input.amount.negate(),
      occurredOn: computeCompetenceOn({
        occurredOn: input.purchaseOn,
        invoiceMonth: input.invoiceMonth,
        planPurchaseOn: input.purchaseOn,
      }),
      invoiceMonth: input.invoiceMonth,
      bank: null,
      bankChange: null,
      removedByBankAt: null,
      ignoredAt: null,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      editNote: null,
      installment: { planId: input.planId, number: input.number },
      transferCounterpartId: null,
      splits: [],
      tagIds: [],
      createdAt: now,
    });
    transaction.assignCategory(input.category, now);
    transaction.replaceTags(input.tags, now);

    return transaction;
  }

  // "Ajustar saldo" (BR-ACC-006): a manual entry outside spending and income, with the difference.
  static createBalanceAdjustment(
    input: { accountId: string; amount: Money; occurredOn: BusinessDate; note: string | null },
    now: string,
  ): Transaction {
    if (input.amount.isZero()) throw new RangeError('A balance adjustment is never zero');

    return new Transaction({
      accountId: input.accountId,
      origin: 'manual',
      nature: 'balance_adjustment',
      natureSetBy: 'user',
      method: 'other',
      description: input.note ? `Ajuste de saldo: ${input.note}` : 'Ajuste de saldo',
      amount: input.amount,
      occurredOn: input.occurredOn,
      invoiceMonth: null,
      bank: null,
      bankChange: null,
      removedByBankAt: null,
      ignoredAt: null,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      editNote: null,
      installment: null,
      transferCounterpartId: null,
      splits: [],
      tagIds: [],
      createdAt: now,
    });
  }

  // What the bank sent, born as a transaction of the sync (BR-TRX-004): the version in use is the
  // bank's own, so it is not "edited". The nature comes from the sign and is the system's to change
  // (`natureSetBy = system`): on a card every entry is an expense (a refund is a positive expense,
  // never income); elsewhere negative is an expense and positive is an income. The detectors and
  // the rules of the round decide the rest. `amount` has the sign of Lucas and is never zero.
  static createFromBank(input: Transaction.CreateFromBankInput, now: string): Transaction {
    if (input.bank.amount.isZero()) throw new RangeError('A bank transaction is never zero');
    if (input.account.isCard !== (input.invoiceMonth !== null)) {
      throw new RangeError('Only a card purchase has an invoice month');
    }

    return new Transaction({
      accountId: input.account.id,
      origin: 'bank',
      nature: input.account.isCard || input.bank.amount.isNegative() ? 'expense' : 'income',
      natureSetBy: 'system',
      method: input.method,
      description: input.bank.description,
      amount: input.bank.amount,
      occurredOn: input.bank.occurredOn,
      invoiceMonth: input.invoiceMonth,
      bank: input.bank,
      bankChange: null,
      removedByBankAt: null,
      ignoredAt: null,
      categoryId: null,
      categorySource: null,
      categoryRuleId: null,
      editNote: null,
      installment: input.installment,
      transferCounterpartId: null,
      splits: [],
      tagIds: [],
      createdAt: now,
    });
  }

  // Both legs of a transfer between own accounts: the same money, opposite values, two accounts.
  // The nature of `first` was already changed by `changeNature`; here the other leg follows it.
  static linkTransfer(
    first: Transaction,
    second: Transaction,
    options: {
      secondHasInvoiceLink: boolean;
      secondHasOccurrenceLink?: boolean;
      secondHasBillLink?: boolean;
      secondIsCardAccount: boolean;
    },
    now: string,
  ): void {
    if (first.id === second.id || first.accountId === second.accountId) {
      throw new RequestValidationError([
        {
          path: 'transferCounterpartId',
          message: 'A outra perna de uma transferência está em outra conta.',
        },
      ]);
    }
    if (!first.amount.add(second.amount).isZero()) {
      throw new RequestValidationError([
        { path: 'transferCounterpartId', message: 'A outra perna precisa ter o valor oposto.' },
      ]);
    }
    if (second.nature !== 'transfer') {
      second.changeNature(
        'transfer',
        {
          hasActiveInvoiceLink: options.secondHasInvoiceLink,
          hasActiveOccurrenceLink: options.secondHasOccurrenceLink ?? false,
          hasActiveBillLink: options.secondHasBillLink ?? false,
          isCardAccount: options.secondIsCardAccount,
        },
        now,
      );
    }
    first.transferCounterpartId = second.id;
    first.updatedAt = now;
    second.transferCounterpartId = first.id;
    second.updatedAt = now;
  }

  isManual(): boolean {
    return this.origin === 'manual';
  }

  isSplit(): boolean {
    return this.splits.length > 0;
  }

  // Only `expense` and `income` count in the month (BR-TRX-006); the other five are outside it.
  hasCountedNature(): boolean {
    return this.nature === 'expense' || this.nature === 'income';
  }

  // Description, amount or date in use differ from the bank's original. Never on a manual one.
  isEdited(): boolean {
    const bank = this.bank;
    if (bank === null) return false;

    return (
      this.description !== bank.description ||
      !this.amount.equals(bank.amount) ||
      !this.occurredOn.equals(bank.occurredOn)
    );
  }

  // Ignored goes out of every account. Removed by the bank goes out too, unless Lucas edited it:
  // then it stays, with the alert (N13).
  entersAccounts(): boolean {
    if (this.ignoredAt !== null) return false;

    return !(this.removedByBankAt !== null && !this.isEdited());
  }

  // "Para revisar" (BR-CAT-008): counts, has no category and is not split.
  isInReview(): boolean {
    return (
      this.hasCountedNature() &&
      this.entersAccounts() &&
      this.categoryId === null &&
      !this.isSplit()
    );
  }

  // The day it counts as spending; `planPurchaseOn` is the purchase date of its installment plan.
  competenceOn(planPurchaseOn: BusinessDate | null): BusinessDate {
    return computeCompetenceOn({
      occurredOn: this.occurredOn,
      invoiceMonth: this.invoiceMonth,
      planPurchaseOn: this.installment ? planPurchaseOn : null,
    });
  }

  // Description in use, the bank's and the sender, upper case and without accents. Feeds the search
  // only (the category rules match in code, not on this text).
  searchText(): string {
    const pieces = [this.description, this.bank?.description, this.bank?.counterparty];
    const unique = [...new Set(pieces.filter((piece): piece is string => Boolean(piece)))];

    return normalizeText(unique.join(' '));
  }

  // Description, amount, date and note (RF-TRX-003). `amount` is positive: the sign stays. A
  // split transaction does not change its value, it would break the sum of the parts (N5).
  // `invoiceMonth` is passed when the date moved on a card purchase (an installment keeps its
  // invoice, N6, and the caller then leaves it out).
  edit(patch: Transaction.EditInput, now: string): void {
    if (patch.amount !== undefined) {
      if (this.isSplit()) throw new TransactionIsSplitError();
      // The whole transaction `lent` is the origin of a debt: its value is the part of the friend,
      // which the bill fixed when it was made (undo the debt to change it).
      if (this.nature === 'lent') throw new TransactionLinkedToBillError();
      if (patch.amount.cents <= 0) throw new RangeError('The edited amount is positive');
    }

    if (patch.description !== undefined) this.description = patch.description;
    if (patch.amount !== undefined) {
      this.amount = this.amount.isNegative() ? patch.amount.negate() : patch.amount;
    }
    if (patch.occurredOn !== undefined) this.occurredOn = patch.occurredOn;
    if (patch.invoiceMonth !== undefined) this.invoiceMonth = patch.invoiceMonth;
    if (patch.editNote !== undefined) this.editNote = patch.editNote;
    this.updatedAt = now;
  }

  // Lucas picks the nature among `expense`, `income` and `transfer` (Q14): it becomes his choice
  // and the detection never undoes it. Flows that own a nature (debt, reimbursement, adjustment, a
  // paid invoice) keep it. A transfer has no category; leaving a transfer cuts the link.
  changeNature(
    nature: 'expense' | 'income' | 'transfer',
    options: Transaction.NatureContext,
    now: string,
  ): void {
    this.assertNatureChange(nature, options);

    // A transfer has no category, except the one that is a transfer itself (`isTransfer`): staying
    // a transfer keeps it (to link the other leg), leaving it (to expense or income) takes it off,
    // the nature no longer comes from it.
    const dropsCategory = this.isTransferByCategory()
      ? nature !== 'transfer'
      : nature === 'transfer';
    this.nature = nature;
    this.natureSetBy = 'user';
    if (dropsCategory) this.clearCategory();
    this.updatedAt = now;
  }

  private assertNatureChange(
    nature: 'expense' | 'income' | 'transfer',
    options: Transaction.NatureContext,
  ): void {
    if (this.isSplit()) throw new TransactionIsSplitError();
    if (
      this.nature === 'lent' ||
      this.nature === 'reimbursed' ||
      this.nature === 'balance_adjustment' ||
      (this.nature === 'invoice_payment' && options.hasActiveInvoiceLink)
    ) {
      throw new TransactionNatureLockedError();
    }
    // A transaction tied to an occurrence only counts there as an income or an expense: turning it
    // into another nature would leave it settling money it no longer is. Undo the link first.
    if (options.hasActiveOccurrenceLink && nature !== this.nature) {
      throw new TransactionLinkedToOccurrenceError();
    }
    // The same for a transaction that pays a bill (the origin of a debt is already `lent`, locked).
    if (options.hasActiveBillLink && nature !== this.nature) {
      throw new TransactionLinkedToBillError();
    }
    // Credit on a card is a refund, an expense with a positive value: it is never income.
    if (nature === 'income' && nature !== this.nature && options.isCardAccount) {
      throw new RequestValidationError([
        { path: 'nature', message: 'Crédito no cartão nunca é receita.' },
      ]);
    }
    // Keeping the nature it already has is never a new mismatch (a card refund is an expense with
    // a positive value).
    if (
      nature !== this.nature &&
      ((nature === 'expense' && !this.amount.isNegative()) ||
        (nature === 'income' && this.amount.isNegative()))
    ) {
      throw new TransactionNatureSignMismatchError();
    }
  }

  // The nature is `transfer` because of a category that is a transfer (`isTransfer`): only that
  // one carries a category on a transfer.
  isTransferByCategory(): boolean {
    return this.nature === 'transfer' && this.categoryId !== null;
  }

  // Whether the category that is a transfer may be put here: the same locks the nature has (a
  // split, a debt, an adjustment, a paid invoice, an occurrence or a bill), as a question.
  canTakeTransferCategory(options: Transaction.NatureContext): boolean {
    try {
      this.assertNatureChange('transfer', options);
    } catch (error) {
      if (error instanceof DomainError || error instanceof RequestValidationError) return false;
      throw error;
    }

    return true;
  }

  // The other leg of a transfer follows an edited amount: the same value with the opposite sign,
  // so the two accounts keep moving the same money.
  mirrorTransferAmount(of: Money, now: string): void {
    this.amount = of.negate();
    this.updatedAt = now;
  }

  // Cuts this leg's link to the other leg of a transfer (the other leg is cut by the caller).
  unlinkTransfer(now: string): void {
    this.transferCounterpartId = null;
    this.updatedAt = now;
  }

  // The nature goes back by the sign when the link that had changed it is undone: negative is an
  // expense, positive an income, and positive on a card is an expense (a refund: credit on a card
  // is never income). The system decides it again, so the detection may act on it.
  returnNature(
    options: { isCardAccount: boolean },
    now: string,
    natureSetBy: 'system' | 'user' = 'system',
  ): void {
    const income = !this.amount.isNegative() && !options.isCardAccount;
    this.nature = income ? 'income' : 'expense';
    this.natureSetBy = natureSetBy;
    this.transferCounterpartId = null;
    this.updatedAt = now;
  }

  // A detector of the import found what this transaction is (BR-TRX-006): a payment of an invoice
  // or one leg of a transfer. Only what the system itself decided may change (`natureSetBy =
  // system`): never a nature Lucas chose, one that owns a flow (debt, adjustment) or a split
  // transaction. The category goes away (a payment or transfer is no spending). Answers whether
  // anything changed.
  applyDetectedNature(nature: 'invoice_payment' | 'transfer', now: string): boolean {
    if (!this.canTakeDetectedNature()) return false;

    this.nature = nature;
    this.clearCategory();
    this.updatedAt = now;

    return true;
  }

  // The system still owns the nature (`natureSetBy = system`), it is a plain expense or income and
  // the transaction is whole: the only case in which a detector may change it.
  canTakeDetectedNature(): boolean {
    return (
      this.natureSetBy === 'system' &&
      !this.isSplit() &&
      (this.nature === 'expense' || this.nature === 'income')
    );
  }

  // The other leg of a transfer the detector found: both point at each other.
  static linkDetectedTransfer(first: Transaction, second: Transaction, now: string): void {
    first.transferCounterpartId = second.id;
    first.updatedAt = now;
    second.transferCounterpartId = first.id;
    second.updatedAt = now;
  }

  // The transaction pays an invoice (the link of `invoices`): its nature becomes `invoice_payment`,
  // set by Lucas, and the category goes away (a payment is no spending). One the import detector
  // already marked keeps its mark and its origin: linking only confirms it, so the undo can tell
  // whether Lucas changed the nature (`releaseFromInvoicePayment` gives it back) or the detector
  // did (it stays a payment and is a suggestion again). A split transaction, or one with another
  // role (transfer, debt, adjustment), cannot pay an invoice.
  markAsInvoicePayment(now: string): void {
    if (this.isSplit()) throw new TransactionIsSplitError();
    if (this.nature === 'invoice_payment') return;
    if (this.nature !== 'expense' && this.nature !== 'income') {
      throw new TransactionNatureLockedError();
    }

    this.nature = 'invoice_payment';
    this.natureSetBy = 'user';
    this.clearCategory();
    this.updatedAt = now;
  }

  // The link to the invoice was undone: what Lucas had turned into a payment goes back by its sign
  // (`returnNature`); what the detector had marked stays as it is.
  releaseFromInvoicePayment(options: { isCardAccount: boolean }, now: string): void {
    if (this.nature !== 'invoice_payment' || this.natureSetBy !== 'user') return;

    this.returnNature(options, now);
  }

  // Sets or clears the category chosen by Lucas. The category lives on the parts of a split
  // transaction, only `expense` and `income` have one, and its kind is the transaction's. One
  // exception: a category that is a transfer (`isTransfer`, "Rotação entre contas") makes the
  // transaction a `transfer` and stays on it, whatever the kind of the category; taking it off (or
  // replacing it) gives the nature back by the sign (negative is expense, positive is income). The
  // other leg of a transfer is cut by the caller, who knows the other transaction.
  assignCategory(
    category: Transaction.CategoryRef | null,
    now: string,
    context: Transaction.NatureContext = { isCardAccount: false },
  ): void {
    if (category === null) {
      if (this.isTransferByCategory()) this.returnNature(context, now);
      this.clearCategory();
      this.updatedAt = now;
      return;
    }
    if (this.isSplit()) throw new TransactionIsSplitError();
    if (category.isArchived) throw new TransactionCategoryArchivedError();
    if (category.isTransfer === true) {
      this.takeTransferCategory(category, now, context);
      return;
    }
    if (this.isTransferByCategory()) {
      this.returnNature(context, now);
      this.clearCategory();
    }
    if (!this.hasCountedNature()) throw new TransactionCategoryNotAllowedError();
    if (category.kind !== this.nature) throw new TransactionCategoryKindMismatchError();

    this.categoryId = category.id;
    this.categorySource = 'user';
    this.categoryRuleId = null;
    this.updatedAt = now;
  }

  // The category that is a transfer: the nature changes as Lucas would change it by hand (so the
  // same locks hold, `TransactionNatureLockedError` first of them), by his choice, and the category
  // stays. A transaction that already was a transfer keeps the other leg; one that was not has none.
  private takeTransferCategory(
    category: Transaction.CategoryRef,
    now: string,
    context: Transaction.NatureContext,
    source: { origin: 'user' } | { origin: 'rule'; ruleId: string } = { origin: 'user' },
  ): void {
    if (this.nature === 'transfer') {
      this.assertNatureChange('transfer', context);
    } else {
      this.changeNature('transfer', context, now);
    }

    this.categoryId = category.id;
    this.categorySource = source.origin;
    this.categoryRuleId = source.origin === 'rule' ? source.ruleId : null;
    this.updatedAt = now;
  }

  // The transaction settles an occurrence of a recurrence that has a category (RF-REC-004): when this
  // one has none, it takes it, with the origin `recurrence`. Never replaces a category that is
  // already there, whoever put it, and never touches a split transaction, one outside expense and
  // income, one of the other kind, or an archived category. Answers whether it took it.
  applyRecurrenceCategory(category: Transaction.CategoryRef, now: string): boolean {
    return this.applyDerivedCategory(category, 'recurrence', now);
  }

  // The transaction pays (or is paid by) a bill that has a category (BR-BIL-006): same rule as the
  // recurrence, with the origin `bill`.
  applyBillCategory(category: Transaction.CategoryRef, now: string): boolean {
    return this.applyDerivedCategory(category, 'bill', now);
  }

  // The payment of the bill was undone: the category the bill had put goes away. One chosen by
  // Lucas or by a rule stays. Answers whether it took it off.
  clearBillCategory(now: string): boolean {
    if (this.categorySource !== 'bill') return false;

    this.clearCategory();
    this.updatedAt = now;

    return true;
  }

  private applyDerivedCategory(
    category: Transaction.CategoryRef,
    source: 'recurrence' | 'bill',
    now: string,
  ): boolean {
    if (this.categoryId !== null || this.isSplit() || !this.hasCountedNature()) return false;
    if (category.isArchived || category.kind !== this.nature || category.isTransfer === true) {
      return false;
    }

    this.categoryId = category.id;
    this.categorySource = source;
    this.categoryRuleId = null;
    this.updatedAt = now;

    return true;
  }

  // The friend's part leaves the counted money (BR-BIL-005). `lent` ("você pagou": an expense whose
  // part of a friend is not spending) or `reimbursed` (the money that came back from a friend is
  // not income). The whole transaction changes nature, with no category, when `friendCents` is its
  // whole value; otherwise it splits in two parts: the rest of Lucas keeps the nature and the
  // category it had, the friend part has the new nature and none. Only a whole `expense` (for
  // `lent`) or `income` (for `reimbursed`) with the right sign.
  moveToFriend(kind: 'lent' | 'reimbursed', friendCents: number, now: string): void {
    const base = kind === 'lent' ? 'expense' : 'income';
    if (this.isSplit()) throw new TransactionIsSplitError();
    if (this.nature !== base || this.amount.isNegative() !== (kind === 'lent')) {
      throw new TransactionNatureLockedError();
    }
    const total = Math.abs(this.amount.cents);
    if (friendCents <= 0 || friendCents > total) {
      throw new RangeError('The part of a friend is positive and at most the whole transaction');
    }

    if (friendCents === total) {
      this.nature = kind;
      this.natureSetBy = 'user';
      this.clearCategory();
    } else {
      const sign = this.amount.isNegative() ? -1 : 1;
      const kept = this.categoryId;
      this.splits = [
        new TransactionSplit({
          id: generateId(),
          position: 1,
          amount: Money.fromCents(sign * (total - friendCents)),
          nature: base,
          categoryId: kept,
          description: null,
        }),
        new TransactionSplit({
          id: generateId(),
          position: 2,
          amount: Money.fromCents(sign * friendCents),
          nature: kind,
          categoryId: null,
          description: null,
        }),
      ];
      this.clearCategory();
    }
    this.updatedAt = now;
  }

  // The undo of `moveToFriend`: the whole transaction goes back to `expense` or `income` (decided by
  // the system again, with no category: the one it had was cleared), the split one is whole again
  // with the category of the part of Lucas. Answers whether there was anything to give back.
  returnFromFriend(kind: 'lent' | 'reimbursed', now: string): boolean {
    const base = kind === 'lent' ? 'expense' : 'income';

    if (this.nature === kind) {
      this.nature = base;
      this.natureSetBy = 'system';
      this.updatedAt = now;

      return true;
    }
    if (!this.splits.some((part) => part.nature === kind)) return false;

    const kept = this.splits.find((part) => part.nature === base);
    this.splits = [];
    this.categoryId = kept?.categoryId ?? null;
    this.categorySource = this.categoryId === null ? null : 'user';
    this.categoryRuleId = null;
    this.updatedAt = now;

    return true;
  }

  // Why a bulk categorization skips this transaction, as the reason of the skip; null when the
  // category fits. The same rules `assignCategory` enforces, as a question instead of an error. The
  // category that is a transfer only goes to a whole expense or income whose nature is free to
  // change (a locked one is skipped, as `outside_account`): the undo of the action then always
  // knows the nature to give back.
  whyCannotTakeCategory(
    category: Transaction.CategoryRef,
    context: Transaction.NatureContext = { isCardAccount: false },
  ): 'split' | 'outside_account' | 'category_kind_mismatch' | null {
    if (this.isSplit()) return 'split';
    if (!this.hasCountedNature()) return 'outside_account';
    if (category.isTransfer === true) {
      return this.canTakeTransferCategory(context) ? null : 'outside_account';
    }
    if (category.kind !== this.nature) return 'category_kind_mismatch';

    return null;
  }

  // Already categorized by Lucas with this very category.
  hasCategoryChosenBy(categoryId: string): boolean {
    return this.categoryId === categoryId && this.categorySource === 'user';
  }

  // Replaces the set of tags. A tag already on the transaction may stay archived; a new one must
  // be active.
  replaceTags(tags: Transaction.TagRef[], now: string): void {
    const unique = [...new Map(tags.map((tag) => [tag.id, tag])).values()];
    for (const tag of unique) {
      if (tag.isArchived && !this.tagIds.includes(tag.id)) throw new TransactionTagArchivedError();
    }

    this.tagIds = unique.map((tag) => tag.id);
    this.updatedAt = now;
  }

  // The parcel of the bank takes the place of one that was not the bank's (a generated one, or the
  // one Lucas entered by hand): what he chose on it (category and tags) goes to the new one.
  inheritChoices(
    choices: {
      categoryId: string | null;
      categorySource: TransactionContract.CategorySource | null;
      categoryRuleId: string | null;
      tagIds: string[];
    },
    now: string,
  ): void {
    if (choices.categoryId !== null && this.hasCountedNature() && !this.isSplit()) {
      this.categoryId = choices.categoryId;
      this.categorySource = choices.categorySource;
      this.categoryRuleId = choices.categoryRuleId;
    }
    this.tagIds = [...new Set(choices.tagIds)];
    this.updatedAt = now;
  }

  // Adds one tag and keeps the others (bulk "Tag"). False when it was already there.
  addTag(tag: Transaction.TagRef, now: string): boolean {
    if (this.tagIds.includes(tag.id)) return false;
    if (tag.isArchived) throw new TransactionTagArchivedError();

    this.tagIds = [...this.tagIds, tag.id];
    this.updatedAt = now;

    return true;
  }

  // A rule of `categories` run over the history (BR-CAT-006): sets its category when this one is
  // free for it (`canRuleSetCategory`) and adds the tags it has that are missing. Never touches a
  // split or ignored transaction, nor one outside expense and income. A rule with a category is
  // blind to a transaction of the other kind. Answers whether anything changed.
  applyRule(
    rule: { id: string; category: Transaction.CategoryRef | null; tagIds: string[] },
    olderRuleIds: ReadonlySet<string>,
    now: string,
    context: Transaction.NatureContext = { isCardAccount: false },
  ): boolean {
    if (this.isSplit() || this.ignoredAt !== null || !this.hasCountedNature()) return false;

    // Put by Lucas, a recurrence or a bill: no rule touches it, category or tags.
    if (this.categorySource !== null && this.categorySource !== 'rule') return false;

    let changed = false;
    if (rule.category !== null) {
      // A category that is a transfer is for both directions (the outgoing and the incoming leg).
      if (rule.category.isTransfer !== true && rule.category.kind !== this.nature) return false;
      if (!canRuleSetCategory(this, olderRuleIds)) return false;
      if (this.categoryId !== rule.category.id) {
        if (rule.category.isTransfer === true) {
          // The nature locks apply as to Lucas: what cannot become a transfer is left as it is.
          if (!this.canTakeTransferCategory(context)) return false;
          this.takeTransferCategory(rule.category, now, context, {
            origin: 'rule',
            ruleId: rule.id,
          });
        } else {
          this.categoryId = rule.category.id;
          this.categorySource = 'rule';
          this.categoryRuleId = rule.id;
        }
        changed = true;
      }
    }

    const missing = rule.tagIds.filter((tagId) => !this.tagIds.includes(tagId));
    if (missing.length > 0) {
      this.tagIds = [...this.tagIds, ...missing];
      changed = true;
    }
    if (changed) this.updatedAt = now;

    return changed;
  }

  ignore(now: string): void {
    if (this.ignoredAt !== null) throw new TransactionAlreadyIgnoredError();
    this.ignoredAt = now;
    this.updatedAt = now;
  }

  unignore(now: string): void {
    if (this.ignoredAt === null) throw new TransactionNotIgnoredError();
    this.ignoredAt = null;
    this.updatedAt = now;
  }

  // Only a manual transaction is deleted (the imported one is ignored), and an installment goes
  // with its plan.
  assertDeletable(): void {
    if (!this.isManual()) throw new TransactionNotManualError();
    if (this.installment !== null) throw new TransactionIsInstallmentError();
  }

  // Splits the transaction into parts (RF-TRX-005); a second call redoes the split. The parts
  // have the sign and the nature of the transaction and add up to its value, and the category
  // moves to them. The parts of a friend (`lent`, `reimbursed`) belong to the bills flow: while
  // they exist the split is not redone nor undone.
  splitInto(parts: Transaction.SplitPartInput[], now: string): void {
    if (!this.hasCountedNature()) throw new TransactionSplitNotAllowedError();
    if (this.splits.some((part) => part.isOutsideSpending())) {
      throw new TransactionSplitLinkedToBillError();
    }
    if (
      parts.length < TRANSACTION_SPLIT_LIMITS.min ||
      parts.length > TRANSACTION_SPLIT_LIMITS.max
    ) {
      throw new RangeError(
        `A split has ${String(TRANSACTION_SPLIT_LIMITS.min)} to ${String(TRANSACTION_SPLIT_LIMITS.max)} parts`,
      );
    }
    if (parts.some((part) => part.amount.cents <= 0)) {
      throw new RangeError('The amount of a part is positive');
    }
    const total = parts.reduce((sum, part) => sum.add(part.amount), Money.zero());
    if (total.cents !== Math.abs(this.amount.cents)) throw new TransactionSplitSumMismatchError();
    for (const part of parts) {
      if (part.category === null) continue;
      if (part.category.isArchived) throw new TransactionCategoryArchivedError();
      if (part.category.isTransfer === true) throw new TransactionCategoryNotAllowedError();
      if (part.category.kind !== this.nature) throw new TransactionCategoryKindMismatchError();
    }

    const nature = this.nature as TransactionSplit.Nature;
    this.splits = parts.map(
      (part, index) =>
        new TransactionSplit({
          id: generateId(),
          position: index + 1,
          amount: this.amount.isNegative() ? part.amount.negate() : part.amount,
          nature,
          categoryId: part.category?.id ?? null,
          description: part.description,
        }),
    );
    this.clearCategory();
    this.updatedAt = now;
  }

  unsplit(now: string): void {
    if (!this.isSplit()) throw new TransactionNotSplitError();
    if (this.splits.some((part) => part.isOutsideSpending())) {
      throw new TransactionSplitLinkedToBillError();
    }

    this.splits = [];
    this.clearCategory();
    this.updatedAt = now;
  }

  // A synchronization brought a new version of the bank's data (BR-TRX-004, BR-TRX-005). Each of
  // description, amount and date: if what is in use was the bank's own, it follows the bank; if
  // Lucas changed it, his version stays and the change waits as `bankChange`. The amount of a split
  // transaction never follows (the parts would stop adding up). The sender and the status are not
  // editable, so they just follow. A transaction the bank had removed and sent again is back.
  // The caller recomputes `invoiceMonth` when the date followed the bank on a card purchase.
  applyBankVersion(version: Transaction.BankVersion, detectedAt: string): void {
    const previous = this.bank;
    if (previous === null) throw new RangeError('A manual transaction has no bank version');

    const found: Transaction.BankFieldChange[] = [];
    const settled = new Set<Transaction.BankFieldChange['field']>();

    if (previous.description !== version.description) {
      if (this.description === previous.description) this.description = version.description;
      else if (this.description === version.description) settled.add('description');
      else
        found.push({
          field: 'description',
          before: previous.description,
          after: version.description,
        });
    }
    if (!previous.amount.equals(version.amount)) {
      if (this.amount.equals(previous.amount) && !this.isSplit()) this.amount = version.amount;
      else if (this.amount.equals(version.amount)) settled.add('amountCents');
      else
        found.push({
          field: 'amountCents',
          before: previous.amount.cents,
          after: version.amount.cents,
        });
    }
    if (!previous.occurredOn.equals(version.occurredOn)) {
      if (this.occurredOn.equals(previous.occurredOn)) this.occurredOn = version.occurredOn;
      else if (this.occurredOn.equals(version.occurredOn)) settled.add('occurredOn');
      else
        found.push({
          field: 'occurredOn',
          before: previous.occurredOn.value,
          after: version.occurredOn.value,
        });
    }

    this.bank = version;
    this.removedByBankAt = null;
    this.mergeBankChanges(found, settled, detectedAt);
    this.updatedAt = detectedAt;
  }

  // The bank stopped sending it. Unedited, it leaves the accounts; edited, it stays with the alert.
  markRemovedByBank(now: string): void {
    if (this.removedByBankAt !== null) return;
    this.removedByBankAt = now;
    this.updatedAt = now;
  }

  // "Restaurar original": copies the bank's description, amount and date to the version in use
  // and clears the note and the pending change. Category and tags stay. A split transaction whose
  // amount differs from the bank's cannot (N5). Does nothing, and answers false, when there is
  // nothing to restore.
  restoreOriginal(now: string): boolean {
    const bank = this.bank;
    if (bank === null) throw new TransactionNotFromBankError();
    if (this.isSplit() && !this.amount.equals(bank.amount)) throw new TransactionIsSplitError();
    if (!this.isEdited() && this.editNote === null && this.bankChange === null) return false;

    this.description = bank.description;
    this.amount = bank.amount;
    this.occurredOn = bank.occurredOn;
    this.editNote = null;
    this.bankChange = null;
    this.updatedAt = now;

    return true;
  }

  // Lucas answers the alert of a change by the bank (N14). `bank` applies the bank's values to the
  // fields that changed (the other edited fields stay) and, if the bank had removed the transaction,
  // accepts it: the version in use goes back to the bank's, so it is no longer edited and leaves
  // the accounts. `mine` keeps what Lucas has and clears the alert, also the one of a removal (the
  // transaction stays, as he left it).
  resolveBankChange(use: 'bank' | 'mine', now: string): void {
    const bank = this.bank;
    if (bank === null || (this.bankChange === null && this.removedByBankAt === null)) {
      throw new TransactionNoBankChangeError();
    }

    if (use === 'mine') {
      this.bankChange = null;
      this.removedByBankAt = null;
      this.updatedAt = now;
      return;
    }

    const changesAmount = this.bankChange?.changes.some((change) => change.field === 'amountCents');
    if (
      this.isSplit() &&
      (changesAmount || (this.removedByBankAt && !this.amount.equals(bank.amount)))
    ) {
      throw new TransactionIsSplitError();
    }

    for (const change of this.bankChange?.changes ?? []) {
      if (change.field === 'description') this.description = change.after;
      else if (change.field === 'amountCents') this.amount = Money.fromCents(change.after);
      else this.occurredOn = BusinessDate.of(change.after);
    }
    if (this.removedByBankAt !== null) {
      this.description = bank.description;
      this.amount = bank.amount;
      this.occurredOn = bank.occurredOn;
    }
    this.bankChange = null;
    this.updatedAt = now;
  }

  // The state "Desfazer" of a bulk action sends back.
  previousState(): TransactionBulk.PreviousState {
    return {
      transactionId: this.id,
      categoryId: this.categoryId,
      categorySource: this.categorySource,
      categoryRuleId: this.categoryRuleId,
      tagIds: [...this.tagIds],
      ignoredAt: this.ignoredAt,
      natureSetBy: this.natureSetBy,
    };
  }

  // Writes back what `previousState` captured. A rule that was deleted since leaves no id.
  restoreState(
    state: TransactionBulk.PreviousState,
    options: { ruleStillExists: boolean; isCardAccount?: boolean },
    now: string,
  ): void {
    // The action had made it a transfer (by the category that is a transfer): the nature goes
    // back by the sign before the saved category (if any) is written.
    if (this.isTransferByCategory() && state.categoryId !== this.categoryId) {
      this.returnNature(
        { isCardAccount: options.isCardAccount ?? false },
        now,
        state.natureSetBy ?? 'system',
      );
      this.clearCategory();
    }
    // The category only fits a whole expense or income: if the nature changed since, or the
    // transaction was split, the saved category is dropped instead of breaking the database rule.
    const keepsCategory = state.categoryId !== null && this.hasCountedNature() && !this.isSplit();
    this.categoryId = keepsCategory ? state.categoryId : null;
    this.categorySource = keepsCategory ? state.categorySource : null;
    this.categoryRuleId = keepsCategory && options.ruleStillExists ? state.categoryRuleId : null;
    this.tagIds = [...new Set(state.tagIds)];
    this.ignoredAt = state.ignoredAt;
    this.updatedAt = now;
  }

  private clearCategory(): void {
    this.categoryId = null;
    this.categorySource = null;
    this.categoryRuleId = null;
  }

  // Joins the changes found now with the ones still pending: the same field keeps the earliest
  // "before" and takes the newest "after", a field that came back to where it began (or to what
  // Lucas has) leaves the alert, and no change left means no alert.
  private mergeBankChanges(
    found: Transaction.BankFieldChange[],
    settled: Set<Transaction.BankFieldChange['field']>,
    detectedAt: string,
  ): void {
    const byField = new Map<Transaction.BankFieldChange['field'], Transaction.BankFieldChange>(
      (this.bankChange?.changes ?? []).map((change) => [change.field, change]),
    );
    for (const field of settled) byField.delete(field);
    for (const change of found) {
      const pending = byField.get(change.field);
      byField.set(
        change.field,
        pending ? ({ ...change, before: pending.before } as Transaction.BankFieldChange) : change,
      );
    }
    for (const [field, change] of byField) {
      if (change.before === change.after) byField.delete(field);
    }

    this.bankChange = byField.size === 0 ? null : { detectedAt, changes: [...byField.values()] };
  }
}

export namespace Transaction {
  export type Attributes = {
    id?: string;
    accountId: string;
    origin: TransactionContract.Origin;
    nature: TransactionContract.Nature;
    natureSetBy: 'system' | 'user';
    method: TransactionContract.Method;
    description: string;
    amount: Money;
    occurredOn: BusinessDate;
    invoiceMonth: Month | null;
    bank: BankVersion | null;
    bankChange: BankChange | null;
    removedByBankAt: string | null;
    ignoredAt: string | null;
    categoryId: string | null;
    categorySource: TransactionContract.CategorySource | null;
    categoryRuleId: string | null;
    editNote: string | null;
    installment: Installment | null;
    transferCounterpartId: string | null;
    splits: TransactionSplit[];
    tagIds: string[];
    createdAt: string;
    updatedAt?: string;
  };

  // What the aggregate needs to know of the other contexts, as plain values read by a port.
  export type AccountRef = { id: string; isCard: boolean; isArchived: boolean };
  // `isTransfer`: the category is a transfer between own accounts ("Rotação entre contas"); absent
  // means it is not.
  export type CategoryRef = {
    id: string;
    kind: 'expense' | 'income';
    isArchived: boolean;
    isTransfer?: boolean;
  };
  // What the nature of a transaction depends on, besides itself: the account and the links.
  export type NatureContext = {
    isCardAccount: boolean;
    hasActiveInvoiceLink?: boolean;
    // It settles an occurrence of a recurrence: the nature is what makes it count there.
    hasActiveOccurrenceLink?: boolean;
    // It pays a bill: the nature is what makes it count there.
    hasActiveBillLink?: boolean;
  };
  export type TagRef = { id: string; isArchived: boolean };

  export type BankVersion = {
    description: string;
    amount: Money;
    occurredOn: BusinessDate;
    counterparty: string | null;
    status: 'pending' | 'posted';
  };

  export type BankFieldChange =
    | { field: 'description'; before: string; after: string }
    | { field: 'occurredOn'; before: string; after: string }
    | { field: 'amountCents'; before: number; after: number };

  export type BankChange = { detectedAt: string; changes: BankFieldChange[] };

  export type Installment = { planId: string; number: number };

  export type CreateManualInput = {
    type: 'expense' | 'income';
    account: AccountRef;
    method: TransactionContract.Method;
    description: string;
    amount: Money;
    occurredOn: BusinessDate;
    invoiceMonth: Month | null;
    category: CategoryRef | null;
    tags: TagRef[];
  };

  export type CreateFromBankInput = {
    account: AccountRef;
    method: TransactionContract.Method;
    bank: BankVersion;
    invoiceMonth: Month | null;
    installment: Installment | null;
  };

  export type CreateParcelInput = {
    planId: string;
    number: number;
    accountId: string;
    description: string;
    amount: Money;
    purchaseOn: BusinessDate;
    invoiceMonth: Month;
    category: CategoryRef | null;
    tags: TagRef[];
  };

  export type EditInput = {
    description?: string;
    amount?: Money;
    occurredOn?: BusinessDate;
    invoiceMonth?: Month | null;
    editNote?: string | null;
  };

  export type SplitPartInput = {
    amount: Money;
    category: CategoryRef | null;
    description: string | null;
  };
}
