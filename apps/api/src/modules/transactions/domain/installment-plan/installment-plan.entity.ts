import { INSTALLMENT_LIMITS } from '@fincheck/shared/transactions/installment-plan/installment-plan.constant.ts';

import { InstallmentAccountNotCardError } from '#/modules/transactions/domain/installment-plan/installment-account-not-card.error.ts';
import { InstallmentInvoicePaidError } from '#/modules/transactions/domain/installment-plan/installment-invoice-paid.error.ts';
import { InstallmentParcelFromBankError } from '#/modules/transactions/domain/installment-plan/installment-parcel-from-bank.error.ts';
import { InstallmentParcelLinkedError } from '#/modules/transactions/domain/installment-plan/installment-parcel-linked.error.ts';
import { InstallmentParcelSplitError } from '#/modules/transactions/domain/installment-plan/installment-parcel-split.error.ts';
import { InstallmentPlanNotManualError } from '#/modules/transactions/domain/installment-plan/installment-plan-not-manual.error.ts';
import { TransactionAccountArchivedError } from '#/modules/transactions/domain/transaction/transaction-account-archived.error.ts';
import { TransactionCategoryArchivedError } from '#/modules/transactions/domain/transaction/transaction-category-archived.error.ts';
import { TransactionCategoryKindMismatchError } from '#/modules/transactions/domain/transaction/transaction-category-kind-mismatch.error.ts';
import { TransactionCategoryNotAllowedError } from '#/modules/transactions/domain/transaction/transaction-category-not-allowed.error.ts';
import { TransactionTagArchivedError } from '#/modules/transactions/domain/transaction/transaction-tag-archived.error.ts';
import { TransactionTagCategoryMismatchError } from '#/modules/transactions/domain/transaction/transaction-tag-category-mismatch.error.ts';
import { TransactionTagNeedsCategoryError } from '#/modules/transactions/domain/transaction/transaction-tag-needs-category.error.ts';
import { computeCompetenceOn } from '#/modules/transactions/domain/transaction/compute-competence-on.util.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// A purchase in installments on a card (RF-INV-003, RF-INV-004). The root of its own aggregate:
// the parcels are transactions, one per invoice, and the plan keeps only what they share. The value
// of each parcel is not stored: it comes from `Money.allocate`, which hands the leftover cents to
// the first one (R$ 1.299,00 in 12 is 12 x 108,25), so the parcels always add up to the total.
export class InstallmentPlan {
  readonly id: string;
  readonly accountId: string;
  readonly origin: 'bank' | 'manual';
  readonly description: string;
  readonly purchaseOn: BusinessDate;
  readonly total: Money;
  readonly installmentCount: number;
  readonly firstInvoiceMonth: Month;
  readonly categoryId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;

  constructor(attr: InstallmentPlan.Attributes) {
    this.id = attr.id ?? generateId();
    this.accountId = attr.accountId;
    this.origin = attr.origin;
    this.description = attr.description;
    this.purchaseOn = attr.purchaseOn;
    this.total = attr.total;
    this.installmentCount = attr.installmentCount;
    this.firstInvoiceMonth = attr.firstInvoiceMonth;
    this.categoryId = attr.categoryId;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // "Compra parcelada": only on an active card, with an expense category when it has one.
  static createManual(input: InstallmentPlan.CreateManualInput, now: string): InstallmentPlan {
    if (!input.account.isCard) throw new InstallmentAccountNotCardError();
    if (input.account.isArchived) throw new TransactionAccountArchivedError();
    if (input.total.cents <= 0) throw new RangeError('The total of a plan is positive');
    if (
      !Number.isInteger(input.installmentCount) ||
      input.installmentCount < INSTALLMENT_LIMITS.min ||
      input.installmentCount > INSTALLMENT_LIMITS.max
    ) {
      throw new RangeError(
        `A plan has ${String(INSTALLMENT_LIMITS.min)} to ${String(INSTALLMENT_LIMITS.max)} parcels`,
      );
    }
    if (input.total.cents < input.installmentCount) {
      throw new RequestValidationError([
        { path: 'totalCents', message: 'O total precisa de ao menos 1 centavo por parcela.' },
      ]);
    }
    if (input.category !== null) {
      if (input.category.isArchived) throw new TransactionCategoryArchivedError();
      if (input.category.isTransfer === true) throw new TransactionCategoryNotAllowedError();
      if (input.category.kind !== 'expense') throw new TransactionCategoryKindMismatchError();
    }
    if (input.tags.length > 0 && input.category === null) {
      throw new TransactionTagNeedsCategoryError();
    }
    if (input.tags.some((tag) => tag.categoryId !== input.category?.id)) {
      throw new TransactionTagCategoryMismatchError();
    }
    if (input.tags.some((tag) => tag.isArchived)) throw new TransactionTagArchivedError();

    return new InstallmentPlan({
      accountId: input.account.id,
      origin: 'manual',
      description: input.description,
      purchaseOn: input.purchaseOn,
      total: input.total,
      installmentCount: input.installmentCount,
      firstInvoiceMonth: input.firstInvoiceMonth,
      categoryId: input.category?.id ?? null,
      createdAt: now,
    });
  }

  // A plan the bank told of (the sync): a card purchase in installments. No category and no tags
  // (the rules of the round put them on the parcels the bank sends). The count is the bank's, inside
  // the limits of the product; the total needs at least one cent per parcel.
  static createFromBank(input: InstallmentPlan.CreateFromBankInput, now: string): InstallmentPlan {
    if (
      !Number.isInteger(input.installmentCount) ||
      input.installmentCount < INSTALLMENT_LIMITS.min ||
      input.installmentCount > INSTALLMENT_LIMITS.max
    ) {
      throw new RangeError('The installments of the bank are outside what Fincheck keeps');
    }
    if (input.total.cents < input.installmentCount) {
      throw new RangeError('The total of a plan has one cent per parcel at least');
    }

    return new InstallmentPlan({
      accountId: input.accountId,
      origin: 'bank',
      description: input.description,
      purchaseOn: input.purchaseOn,
      total: input.total,
      installmentCount: input.installmentCount,
      firstInvoiceMonth: input.firstInvoiceMonth,
      categoryId: null,
      createdAt: now,
    });
  }

  // The value of each parcel, in order: they add up to the total.
  amounts(): Money[] {
    return this.total.allocate(this.installmentCount);
  }

  // The invoice of parcel `number` (1-based): the first one plus `number - 1` months.
  invoiceMonthOf(number: number): Month {
    let month = this.firstInvoiceMonth;
    for (let step = 1; step < number; step++) month = month.next();

    return month;
  }

  // The parcels as transactions: parcel k on the invoice `firstInvoiceMonth + (k - 1)`, in the day
  // of the purchase of that month, all with the category and the tags of the plan.
  buildParcels(input: InstallmentPlan.BuildParcelsInput, now: string): Transaction[] {
    return this.amounts().map((amount, index) =>
      Transaction.createInstallmentParcel(
        {
          planId: this.id,
          number: index + 1,
          accountId: this.accountId,
          description: this.description,
          amount,
          purchaseOn: this.purchaseOn,
          invoiceMonth: this.invoiceMonthOf(index + 1),
          category: input.category,
          tags: input.tags,
        },
        now,
      ),
    );
  }

  // A plan of the bank is rebuilt by every synchronization: only the one entered by hand is deleted.
  assertDeletable(): void {
    if (this.origin !== 'manual') throw new InstallmentPlanNotManualError();
  }

  // The same for the edit: the plan of the bank is rebuilt by the synchronization.
  assertEditable(): void {
    if (this.origin !== 'manual') throw new InstallmentPlanNotManualError();
  }

  // The card of an archived plan takes no edit, as it takes no new plan.
  assertCardActive(account: Transaction.AccountRef): void {
    if (account.isArchived) throw new TransactionAccountArchivedError();
  }

  // The plan after Lucas edited it: only a plan entered by hand, with the same checks as the
  // creation on the final state (2 to 48 parcels, one cent each at least, first and last invoice
  // inside the years the API accepts) and on what he changed (the category must be an active
  // expense one that is not a transfer; the tags belong to the category the plan ends up with).
  // Nothing in `change` differing from the plan, and no tags sent, gives the plan itself back.
  // `change.category` is `null` to take the category off and absent to keep it.
  withChanges(change: InstallmentPlan.Change, now: string): InstallmentPlan {
    this.assertEditable();

    const total = change.total ?? this.total;
    const installmentCount = change.installmentCount ?? this.installmentCount;
    const firstInvoiceMonth = change.firstInvoiceMonth ?? this.firstInvoiceMonth;
    const description = change.description ?? this.description;
    const categoryId =
      change.category === undefined ? this.categoryId : (change.category?.id ?? null);

    if (total.cents <= 0) throw new RangeError('The total of a plan is positive');
    if (
      !Number.isInteger(installmentCount) ||
      installmentCount < INSTALLMENT_LIMITS.min ||
      installmentCount > INSTALLMENT_LIMITS.max
    ) {
      throw new RangeError(
        `A plan has ${String(INSTALLMENT_LIMITS.min)} to ${String(INSTALLMENT_LIMITS.max)} parcels`,
      );
    }
    if (total.cents < installmentCount) {
      throw new RequestValidationError([
        { path: 'totalCents', message: 'O total precisa de ao menos 1 centavo por parcela.' },
      ]);
    }
    assertSupportedMonth(firstInvoiceMonth, 'firstInvoiceMonth');
    let lastInvoiceMonth = firstInvoiceMonth;
    for (let parcel = 1; parcel < installmentCount; parcel++) {
      lastInvoiceMonth = lastInvoiceMonth.next();
    }
    assertSupportedMonth(lastInvoiceMonth, 'installmentCount');

    if (change.category && change.category.id !== this.categoryId) {
      if (change.category.isArchived) throw new TransactionCategoryArchivedError();
      if (change.category.isTransfer === true) throw new TransactionCategoryNotAllowedError();
      if (change.category.kind !== 'expense') throw new TransactionCategoryKindMismatchError();
    }
    if (change.tags !== undefined) {
      if (change.tags.length > 0 && categoryId === null) {
        throw new TransactionTagNeedsCategoryError();
      }
      if (change.tags.some((tag) => tag.categoryId !== categoryId)) {
        throw new TransactionTagCategoryMismatchError();
      }
    }

    const unchanged =
      change.tags === undefined &&
      description === this.description &&
      total.equals(this.total) &&
      installmentCount === this.installmentCount &&
      firstInvoiceMonth.equals(this.firstInvoiceMonth) &&
      categoryId === this.categoryId;
    if (unchanged) return this;

    return new InstallmentPlan({
      id: this.id,
      accountId: this.accountId,
      origin: this.origin,
      description,
      purchaseOn: this.purchaseOn,
      total,
      installmentCount,
      firstInvoiceMonth,
      categoryId,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }

  // The parcels after this plan took the place of `previous` (the plan as it was when `parcels` were
  // read), in place: parcels 1 to min(old, new) are updated, keeping their identity (so their links,
  // tags and history stay), the new ones at the end are created, and the last ones go when the count
  // falls. The parcels always add up to the total: when the total or the count changed, every
  // parcel takes the `Money.allocate` of the new total (the first one takes the leftover cents),
  // even one Lucas edited by hand. What he did not change is left alone: the description, the
  // category and the invoice move only if the plan's own changed, and the tags only if they differ.
  //
  // When the request carried the total or the count (`valuesSent`), even equal to the current ones,
  // each parcel is compared with the new allocation and the ones that differ are rewritten (a parcel
  // Lucas edited by hand on its own goes back to its share), so the sum is the total again.
  //
  // The money rules (they apply to a parcel whose value changes or that is removed; a parcel that
  // only moves invoice is held by the paid invoice rule alone):
  //  - a parcel the bank sent (`origin = bank`) keeps its value, its date and its invoice and is not
  //    removed: refused (description, category and tags still apply to it). Only the same total and
  //    count sent again leave it as it is, without a refusal;
  //  - a split parcel keeps its value, and takes no other category or tags of the plan;
  //  - a parcel that pays a bill or settles an occurrence keeps its value, and is not removed;
  //  - an invoice with a payment registered takes no parcel in or out and no change of value. A
  //    parcel that does not enter the accounts (ignored, removed by the bank) is on no sum, so it
  //    never touches an invoice.
  // Everything is checked in memory, before the caller saves anything.
  reconcileParcels(
    input: InstallmentPlan.ReconcileInput,
    now: string,
  ): InstallmentPlan.ReconciledParcels {
    const { previous, parcels } = input;
    const byNumber = new Map(
      parcels.flatMap((parcel) =>
        parcel.installment ? [[parcel.installment.number, parcel] as const] : [],
      ),
    );
    const amounts = this.amounts();
    const valuesMove =
      !this.total.equals(previous.total) || this.installmentCount !== previous.installmentCount;
    const monthMoves = !this.firstInvoiceMonth.equals(previous.firstInvoiceMonth);
    const categoryMoves = this.categoryId !== previous.categoryId;
    const descriptionMoves = this.description !== previous.description;
    if ((this.categoryId === null) !== (input.category === null)) {
      throw new Error('The category of the plan and the one handed to the reconciliation differ');
    }

    const saved: Transaction[] = [];
    const removed: Transaction[] = [];

    for (let number = 1; number <= this.installmentCount; number++) {
      const amount = amounts[number - 1];
      if (amount === undefined) throw new Error('The allocation is shorter than the count');
      const invoiceMonth = this.invoiceMonthOf(number);
      const parcel = byNumber.get(number);

      if (parcel === undefined) {
        this.assertInvoiceUnpaid(invoiceMonth, input.paidInvoiceMonths);
        saved.push(this.buildNewParcel(number, amount, invoiceMonth, input, categoryMoves, now));
        continue;
      }

      let amountMoves =
        (valuesMove || input.valuesSent) && Math.abs(parcel.amount.cents) !== amount.cents;
      const parcelMonth = parcel.invoiceMonth;
      const moves = monthMoves && (parcelMonth === null || !parcelMonth.equals(invoiceMonth));
      if (parcel.origin === 'bank') {
        // The bank owns the value and the invoice of its parcel. A real change of the plan that
        // would move them is refused; the same total and count sent again leave the parcel as it is.
        if (moves || (amountMoves && valuesMove)) throw new InstallmentParcelFromBankError(number);
        amountMoves = false;
      }
      if (amountMoves) this.assertParcelKeepsValue(parcel, number, input.linkedParcelIds);
      if ((amountMoves || moves) && parcel.entersAccounts()) {
        this.assertInvoiceUnpaid(parcelMonth, input.paidInvoiceMonths);
        if (moves) this.assertInvoiceUnpaid(invoiceMonth, input.paidInvoiceMonths);
      }

      const touched = this.updateParcel(parcel, number, input, now, {
        amount: amountMoves ? amount : undefined,
        invoiceMonth: moves ? invoiceMonth : undefined,
        description: descriptionMoves ? this.description : undefined,
        categoryMoves,
      });
      if (touched) saved.push(parcel);
    }

    for (const parcel of parcels) {
      const number = parcel.installment?.number ?? 0;
      if (number <= this.installmentCount) continue;

      if (parcel.origin === 'bank') throw new InstallmentParcelFromBankError(number);
      this.assertParcelKeepsValue(parcel, number, input.linkedParcelIds);
      if (parcel.entersAccounts()) {
        this.assertInvoiceUnpaid(parcel.invoiceMonth, input.paidInvoiceMonths);
      }
      removed.push(parcel);
    }

    return { saved, removed };
  }

  private assertParcelKeepsValue(
    parcel: Transaction,
    number: number,
    linkedParcelIds: ReadonlySet<string>,
  ): void {
    if (parcel.isSplit()) throw new InstallmentParcelSplitError(number);
    if (linkedParcelIds.has(parcel.id)) throw new InstallmentParcelLinkedError(number);
  }

  private assertInvoiceUnpaid(month: Month | null, paidInvoiceMonths: ReadonlySet<string>): void {
    if (month !== null && paidInvoiceMonths.has(month.value)) {
      throw new InstallmentInvoicePaidError(month.value);
    }
  }

  // Applies what moved to one parcel that stays. Answers whether it changed anything.
  private updateParcel(
    parcel: Transaction,
    number: number,
    input: InstallmentPlan.ReconcileInput,
    now: string,
    moved: {
      amount: Money | undefined;
      invoiceMonth: Month | undefined;
      description: string | undefined;
      categoryMoves: boolean;
    },
  ): boolean {
    let touched = false;

    if (
      moved.amount !== undefined ||
      moved.invoiceMonth !== undefined ||
      moved.description !== undefined
    ) {
      parcel.edit(
        {
          ...(moved.description === undefined ? {} : { description: moved.description }),
          ...(moved.amount === undefined ? {} : { amount: moved.amount }),
          ...(moved.invoiceMonth === undefined
            ? {}
            : {
                invoiceMonth: moved.invoiceMonth,
                occurredOn: computeCompetenceOn({
                  occurredOn: this.purchaseOn,
                  invoiceMonth: moved.invoiceMonth,
                  planPurchaseOn: this.purchaseOn,
                }),
              }),
        },
        now,
      );
      touched = true;
    }

    // A split parcel has no category of its own: its parts do, and so the tags. Taking the
    // category off leaves it as it is; any other change of category or tags is refused.
    if (moved.categoryMoves && !(parcel.isSplit() && input.category === null)) {
      if (parcel.isSplit()) throw new InstallmentParcelSplitError(number);
      parcel.assignCategory(input.category, now);
      touched = true;
    }
    if (input.tags !== undefined) {
      const wanted = new Set(input.tags.map((tag) => tag.id));
      const same =
        wanted.size === parcel.tagIds.length && parcel.tagIds.every((id) => wanted.has(id));
      if (!same) {
        if (parcel.isSplit()) throw new InstallmentParcelSplitError(number);
        parcel.replaceTags(input.tags, now);
        touched = true;
      }
    }

    return touched;
  }

  // A parcel born by the edit: it takes the category of the plan and the tags that were sent; with
  // none sent and the category kept, it inherits the tags of the last parcel that stays (one that is
  // not split), the ones still active and of the category. An archived tag never goes to a new parcel.
  private buildNewParcel(
    number: number,
    amount: Money,
    invoiceMonth: Month,
    input: InstallmentPlan.ReconcileInput,
    categoryMoves: boolean,
    now: string,
  ): Transaction {
    let tags: Transaction.TagRef[] = [];
    if (this.categoryId !== null) {
      if (input.tags !== undefined) {
        tags = input.tags;
      } else if (!categoryMoves) {
        const reference = input.parcels
          .filter(
            (parcel) =>
              !parcel.isSplit() && (parcel.installment?.number ?? 0) <= this.installmentCount,
          )
          .sort((a, b) => (b.installment?.number ?? 0) - (a.installment?.number ?? 0))[0];
        tags = (reference?.tagIds ?? []).flatMap((id) => {
          const tag = input.knownTags.get(id);

          return tag ? [tag] : [];
        });
      }
      tags = tags.filter((tag) => !tag.isArchived && tag.categoryId === this.categoryId);
    }

    return Transaction.createInstallmentParcel(
      {
        planId: this.id,
        number,
        accountId: this.accountId,
        description: this.description,
        amount,
        purchaseOn: this.purchaseOn,
        invoiceMonth,
        category: input.category,
        tags,
      },
      now,
    );
  }
}

export namespace InstallmentPlan {
  export type Attributes = {
    id?: string;
    accountId: string;
    origin: 'bank' | 'manual';
    description: string;
    purchaseOn: BusinessDate;
    total: Money;
    installmentCount: number;
    firstInvoiceMonth: Month;
    categoryId: string | null;
    createdAt: string;
    updatedAt?: string;
  };

  export type CreateManualInput = {
    account: Transaction.AccountRef;
    description: string;
    total: Money;
    installmentCount: number;
    firstInvoiceMonth: Month;
    purchaseOn: BusinessDate;
    category: Transaction.CategoryRef | null;
    tags: Transaction.TagRef[];
  };

  export type CreateFromBankInput = {
    accountId: string;
    description: string;
    purchaseOn: BusinessDate;
    total: Money;
    installmentCount: number;
    firstInvoiceMonth: Month;
  };

  // What Lucas changes in a plan; a field left out stays. `category: null` takes the category off.
  export type Change = {
    description?: string;
    total?: Money;
    installmentCount?: number;
    firstInvoiceMonth?: Month;
    category?: Transaction.CategoryRef | null;
    tags?: Transaction.TagRef[];
  };

  export type ReconcileInput = {
    // The plan as it was when the parcels were read.
    previous: InstallmentPlan;
    parcels: Transaction[];
    // The request carried the total or the count, equal to the current one or not.
    valuesSent: boolean;
    // The category of the plan after the change (null when it has none).
    category: Transaction.CategoryRef | null;
    // The tags Lucas sent; undefined when he sent none.
    tags?: Transaction.TagRef[];
    // The tags the parcels have now, by id (a new parcel inherits from them).
    knownTags: ReadonlyMap<string, Transaction.TagRef>;
    // The months (`YYYY-MM`) of the invoices of the card that have a payment registered.
    paidInvoiceMonths: ReadonlySet<string>;
    // The parcels that pay a bill or settle an occurrence.
    linkedParcelIds: ReadonlySet<string>;
  };

  export type ReconciledParcels = {
    // Updated or created: to save.
    saved: Transaction[];
    // Out of the plan: to delete.
    removed: Transaction[];
  };

  export type BuildParcelsInput = {
    category: Transaction.CategoryRef | null;
    tags: Transaction.TagRef[];
  };
}
