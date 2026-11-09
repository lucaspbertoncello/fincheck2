import { INSTALLMENT_LIMITS } from '@fincheck/shared/transactions/installment-plan/installment-plan.constant.ts';

import { InstallmentAccountNotCardError } from '#/modules/transactions/domain/installment-plan/installment-account-not-card.error.ts';
import { InstallmentPlanNotManualError } from '#/modules/transactions/domain/installment-plan/installment-plan-not-manual.error.ts';
import { TransactionAccountArchivedError } from '#/modules/transactions/domain/transaction/transaction-account-archived.error.ts';
import { TransactionCategoryArchivedError } from '#/modules/transactions/domain/transaction/transaction-category-archived.error.ts';
import { TransactionCategoryKindMismatchError } from '#/modules/transactions/domain/transaction/transaction-category-kind-mismatch.error.ts';
import { TransactionCategoryNotAllowedError } from '#/modules/transactions/domain/transaction/transaction-category-not-allowed.error.ts';
import { TransactionTagArchivedError } from '#/modules/transactions/domain/transaction/transaction-tag-archived.error.ts';
import { Transaction } from '#/modules/transactions/domain/transaction/transaction.entity.ts';
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

  export type BuildParcelsInput = {
    category: Transaction.CategoryRef | null;
    tags: Transaction.TagRef[];
  };
}
