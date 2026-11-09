import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { SubscriptionService } from '@fincheck/shared/recurrences/subscription-service/subscription-service.type.ts';
import type { Transaction } from '@fincheck/shared/transactions/transaction/transaction.type.ts';

import type { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { RecurrenceAlreadyPausedError } from '#/modules/recurrences/domain/recurrence/recurrence-already-paused.error.ts';
import { RecurrenceArchivedError } from '#/modules/recurrences/domain/recurrence/recurrence-archived.error.ts';
import { RecurrenceCategoryKindMismatchError } from '#/modules/recurrences/domain/recurrence/recurrence-category-kind-mismatch.error.ts';
import { RecurrenceNotPausedError } from '#/modules/recurrences/domain/recurrence/recurrence-not-paused.error.ts';
import { RecurrenceRegimeOnlyForIncomeError } from '#/modules/recurrences/domain/recurrence/recurrence-regime-only-for-income.error.ts';
import type { Month } from '#/shared/date/month.value-object.ts';
import { RequestValidationError } from '#/shared/errors/request-validation.error.ts';
import { generateId } from '#/shared/id/generate-id.util.ts';
import type { Money } from '#/shared/money/money.value-object.ts';

// The rule behind something that comes in or goes out every month: "Mesada, any day, R$ 850" or
// "Netflix, day 12, R$ 55,90". It is the template; the vez of each month is an `Occurrence`. A
// subscription (BR-REC-017) is not a new object: it is an expense recurrence with `isSubscription`,
// paid by any method. The state of a month never lives here.
//
// Pausing stops new occurrences; deleting archives it (it leaves the screens, the past months stay
// as history). An archived recurrence takes no change.
export class Recurrence {
  readonly id: string;
  // Never changes after creation (BR-REC-011).
  readonly kind: RecurrenceContract.Kind;
  name: string;
  expectedAmount: Money;
  amountMode: RecurrenceContract.AmountMode;
  counterparty: string | null;
  // What to look for in the sender and the description of the bank, already normalized.
  matchText: string | null;
  employmentRegime: RecurrenceContract.EmploymentRegime | null;
  accountId: string | null;
  method: Transaction.Method | null;
  categoryId: string | null;
  isSubscription: boolean;
  serviceSlug: SubscriptionService.Slug | null;
  dateRule: DateRule;
  // 1 to 5 payments in the month, or `null` for "as many as come": no limit, the month adds up what
  // arrives until the expected amount is reached and the rest shows as received over.
  maxPayments: number | null;
  startsMonth: Month;
  pausedAt: string | null;
  archivedAt: string | null;
  readonly createdAt: string;
  updatedAt: string;

  constructor(attr: Recurrence.Attributes) {
    this.id = attr.id ?? generateId();
    this.kind = attr.kind;
    this.name = attr.name;
    this.expectedAmount = attr.expectedAmount;
    this.amountMode = attr.amountMode;
    this.counterparty = attr.counterparty;
    this.matchText = attr.matchText;
    this.employmentRegime = attr.employmentRegime;
    this.accountId = attr.accountId;
    this.method = attr.method;
    this.categoryId = attr.categoryId;
    this.isSubscription = attr.isSubscription;
    this.serviceSlug = attr.serviceSlug;
    this.dateRule = attr.dateRule;
    this.maxPayments = attr.maxPayments;
    this.startsMonth = attr.startsMonth;
    this.pausedAt = attr.pausedAt;
    this.archivedAt = attr.archivedAt;
    this.createdAt = attr.createdAt;
    this.updatedAt = attr.updatedAt ?? attr.createdAt;
  }

  // "Nova recorrência". The regime is a label of an income source; the subscription mark and its
  // service only go with an expense (the same refusals the body schema makes, repeated here because
  // the entity is also built from a suggestion, not only from a body).
  static create(input: Recurrence.CreateInput, now: string): Recurrence {
    if (input.expectedAmount.cents <= 0) throw new RangeError('The expected amount is positive');
    if ((input.employmentRegime ?? null) !== null && input.kind !== 'income') {
      throw new RecurrenceRegimeOnlyForIncomeError();
    }
    const isSubscription = input.isSubscription ?? false;
    Recurrence.assertSubscriptionFits(input.kind, isSubscription, input.serviceSlug ?? null);

    return new Recurrence({
      kind: input.kind,
      name: input.name,
      expectedAmount: input.expectedAmount,
      amountMode: input.amountMode ?? 'fixed',
      counterparty: input.counterparty ?? null,
      matchText: Recurrence.normalizeMatchText(input.matchText),
      employmentRegime: input.employmentRegime ?? null,
      accountId: input.accountId ?? null,
      method: input.method ?? null,
      categoryId: input.categoryId ?? null,
      isSubscription,
      serviceSlug: input.serviceSlug ?? null,
      dateRule: input.dateRule,
      // Left out is one payment; `null` is "as many as come".
      maxPayments: input.maxPayments === undefined ? 1 : input.maxPayments,
      startsMonth: input.startsMonth,
      pausedAt: null,
      archivedAt: null,
      createdAt: now,
    });
  }

  isPaused(): boolean {
    return this.pausedAt !== null;
  }

  isArchived(): boolean {
    return this.archivedAt !== null;
  }

  // Generates occurrences: neither paused nor archived.
  isActive(): boolean {
    return this.pausedAt === null && this.archivedAt === null;
  }

  assertNotArchived(): void {
    if (this.archivedAt !== null) throw new RecurrenceArchivedError();
  }

  // The category a linked transaction receives is of the kind of the recurrence: income takes an
  // income category, expense an expense one.
  assertCategoryFits(category: { kind: RecurrenceContract.Kind }): void {
    if (category.kind !== this.kind) throw new RecurrenceCategoryKindMismatchError();
  }

  // "Editar recorrência". A field left out stays; `null` clears the ones that may be empty. What
  // changed comes back so the caller knows which occurrences to redo (only the field that moved is
  // copied to a month, so a value edited by hand in another month stays).
  edit(patch: Recurrence.EditInput, now: string): Recurrence.Changes {
    this.assertNotArchived();

    const regime =
      patch.employmentRegime === undefined ? this.employmentRegime : patch.employmentRegime;
    if (regime !== null && this.kind !== 'income') throw new RecurrenceRegimeOnlyForIncomeError();

    const isSubscription = patch.isSubscription ?? this.isSubscription;
    let serviceSlug = patch.serviceSlug === undefined ? this.serviceSlug : patch.serviceSlug;
    // Turning the mark off drops the service with it.
    if (!isSubscription && patch.serviceSlug === undefined) serviceSlug = null;
    Recurrence.assertSubscriptionFits(this.kind, isSubscription, serviceSlug);

    const changes: Recurrence.Changes = {
      amount:
        patch.expectedAmount !== undefined && !patch.expectedAmount.equals(this.expectedAmount),
      dateRule: patch.dateRule !== undefined && !patch.dateRule.equals(this.dateRule),
      startsMonth: patch.startsMonth !== undefined && !patch.startsMonth.equals(this.startsMonth),
      startsLater:
        patch.startsMonth !== undefined && this.startsMonth.value < patch.startsMonth.value,
    };

    if (patch.name !== undefined) this.name = patch.name;
    if (patch.expectedAmount !== undefined) this.expectedAmount = patch.expectedAmount;
    if (patch.amountMode !== undefined) this.amountMode = patch.amountMode;
    if (patch.counterparty !== undefined) this.counterparty = patch.counterparty;
    if (patch.matchText !== undefined) {
      this.matchText = Recurrence.normalizeMatchText(patch.matchText);
    }
    this.employmentRegime = regime;
    if (patch.accountId !== undefined) this.accountId = patch.accountId;
    if (patch.method !== undefined) this.method = patch.method;
    if (patch.categoryId !== undefined) this.categoryId = patch.categoryId;
    this.isSubscription = isSubscription;
    this.serviceSlug = serviceSlug;
    if (patch.dateRule !== undefined) this.dateRule = patch.dateRule;
    if (patch.maxPayments !== undefined) this.maxPayments = patch.maxPayments;
    if (patch.startsMonth !== undefined) this.startsMonth = patch.startsMonth;
    this.updatedAt = now;

    return changes;
  }

  // "Pausar": stops generating occurrences. The caller drops the future ones with no payment.
  pause(now: string): void {
    this.assertNotArchived();
    if (this.pausedAt !== null) throw new RecurrenceAlreadyPausedError();

    this.pausedAt = now;
    this.updatedAt = now;
  }

  resume(now: string): void {
    this.assertNotArchived();
    if (this.pausedAt === null) throw new RecurrenceNotPausedError();

    this.pausedAt = null;
    this.updatedAt = now;
  }

  // "Excluir": archives. Deleting twice is the same as deleting once; answers whether it changed.
  archive(now: string): boolean {
    if (this.archivedAt !== null) return false;

    this.archivedAt = now;
    this.updatedAt = now;

    return true;
  }

  // The expected amount becomes the last one received (BR-REC-009 "Atualizar", BR-REC-014).
  adoptAmount(amount: Money, now: string): void {
    if (amount.cents <= 0) throw new RangeError('The expected amount is positive');

    this.expectedAmount = amount;
    this.updatedAt = now;
  }

  private static normalizeMatchText(text: string | null | undefined): string | null {
    if (text === null || text === undefined) return null;
    const normalized = normalizeText(text);

    return normalized === '' ? null : normalized;
  }

  private static assertSubscriptionFits(
    kind: RecurrenceContract.Kind,
    isSubscription: boolean,
    serviceSlug: SubscriptionService.Slug | null,
  ): void {
    if (isSubscription && kind !== 'expense') {
      throw new RequestValidationError([
        { path: 'isSubscription', message: 'Only an expense can be a subscription' },
      ]);
    }
    if (serviceSlug !== null && !isSubscription) {
      throw new RequestValidationError([
        { path: 'serviceSlug', message: 'A service only goes with a subscription' },
      ]);
    }
  }
}

export namespace Recurrence {
  export type Attributes = {
    id?: string;
    kind: RecurrenceContract.Kind;
    name: string;
    expectedAmount: Money;
    amountMode: RecurrenceContract.AmountMode;
    counterparty: string | null;
    matchText: string | null;
    employmentRegime: RecurrenceContract.EmploymentRegime | null;
    accountId: string | null;
    method: Transaction.Method | null;
    categoryId: string | null;
    isSubscription: boolean;
    serviceSlug: SubscriptionService.Slug | null;
    dateRule: DateRule;
    maxPayments: number | null;
    startsMonth: Month;
    pausedAt: string | null;
    archivedAt: string | null;
    createdAt: string;
    updatedAt?: string;
  };

  export type CreateInput = {
    kind: RecurrenceContract.Kind;
    name: string;
    expectedAmount: Money;
    amountMode?: RecurrenceContract.AmountMode | undefined;
    counterparty?: string | null | undefined;
    matchText?: string | null | undefined;
    employmentRegime?: RecurrenceContract.EmploymentRegime | null | undefined;
    accountId?: string | null | undefined;
    method?: Transaction.Method | null | undefined;
    categoryId?: string | null | undefined;
    isSubscription?: boolean | undefined;
    serviceSlug?: SubscriptionService.Slug | null | undefined;
    dateRule: DateRule;
    maxPayments?: number | null | undefined;
    startsMonth: Month;
  };

  // `undefined` leaves the field as it is; `null` clears the ones that may be empty.
  export type EditInput = {
    name?: string | undefined;
    expectedAmount?: Money | undefined;
    amountMode?: RecurrenceContract.AmountMode | undefined;
    counterparty?: string | null | undefined;
    matchText?: string | null | undefined;
    employmentRegime?: RecurrenceContract.EmploymentRegime | null | undefined;
    accountId?: string | null | undefined;
    method?: Transaction.Method | null | undefined;
    categoryId?: string | null | undefined;
    isSubscription?: boolean | undefined;
    serviceSlug?: SubscriptionService.Slug | null | undefined;
    dateRule?: DateRule | undefined;
    maxPayments?: number | null | undefined;
    startsMonth?: Month | undefined;
  };

  // The fields of an edit that the occurrences copy, and whether they really moved.
  export type Changes = {
    amount: boolean;
    dateRule: boolean;
    startsMonth: boolean;
    // `startsMonth` moved to a later month.
    startsLater: boolean;
  };
}
