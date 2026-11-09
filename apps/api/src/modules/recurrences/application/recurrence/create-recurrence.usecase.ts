import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceOpener } from '#/modules/recurrences/application/occurrence/occurrence-opener.service.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { LinkedElsewhereReader } from '#/modules/recurrences/application/occurrence-payment/linked-elsewhere-reader.interface.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import type { RecurrenceActivator } from '#/modules/recurrences/application/recurrence/recurrence-activator.service.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { RecurrenceAccountReader } from '#/modules/recurrences/application/recurrence/recurrence-account-reader.interface.ts';
import type { RecurrenceCategoryReader } from '#/modules/recurrences/application/recurrence/recurrence-category-reader.interface.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import { assertTransactionCanPayOccurrence } from '#/modules/recurrences/domain/occurrence-payment/assert-transaction-can-pay-occurrence.util.ts';
import { OccurrenceTransactionAlreadyLinkedError } from '#/modules/recurrences/domain/occurrence-payment/occurrence-transaction-already-linked.error.ts';
import { DateRule } from '#/modules/recurrences/domain/recurrence/date-rule.value-object.ts';
import { RecurrenceAccountArchivedError } from '#/modules/recurrences/domain/recurrence/recurrence-account-archived.error.ts';
import { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import { Money } from '#/shared/money/money.value-object.ts';
import type { UnitOfWork } from '#/shared/unit-of-work/unit-of-work.interface.ts';

// "Nova recorrência" and "Criar recorrência" from a transaction (RF-REC-001, 002): writes the
// recurrence, creates its occurrences and, when a transaction is given, ties it to the occurrence
// of its own month (BR-REC-007, decision R7: a past month is opened for it, and the recurrence
// starts in it unless a first month is given). All in one unit of work, so a failure leaves
// nothing half done. The order of the errors: the account, the category and the transaction that
// do not exist (404), the regime and the category of the wrong kind and the transaction of the
// wrong kind (422), the transaction already linked (409).
export class CreateRecurrenceUseCase {
  private readonly accounts: RecurrenceAccountReader;
  private readonly categories: RecurrenceCategoryReader;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly activator: RecurrenceActivator;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly opener: OccurrenceOpener;
  private readonly unitOfWork: UnitOfWork<Kysely<Database>>;
  private readonly clock: Clock;
  private readonly linkedElsewhere: LinkedElsewhereReader | undefined;

  constructor(
    accounts: RecurrenceAccountReader,
    categories: RecurrenceCategoryReader,
    transactions: OccurrenceTransactionReader,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    activator: RecurrenceActivator,
    builder: OccurrenceDtoBuilder,
    opener: OccurrenceOpener,
    unitOfWork: UnitOfWork<Kysely<Database>>,
    clock: Clock,
    linkedElsewhere?: LinkedElsewhereReader,
  ) {
    this.linkedElsewhere = linkedElsewhere;
    this.accounts = accounts;
    this.categories = categories;
    this.transactions = transactions;
    this.occurrences = occurrences;
    this.activator = activator;
    this.builder = builder;
    this.opener = opener;
    this.unitOfWork = unitOfWork;
    this.clock = clock;
  }

  async execute(input: CreateRecurrenceUseCase.Input): Promise<CreateRecurrenceUseCase.Output> {
    return this.unitOfWork.run(async (executor) => {
      const dateRule = DateRule.create(input.dateRule);
      if (input.startsMonth !== undefined) {
        assertSupportedMonth(Month.of(input.startsMonth), 'startsMonth');
      }

      const account =
        input.accountId === undefined
          ? null
          : await this.accounts.requireAccount(input.accountId, executor);
      const category =
        input.categoryId === undefined
          ? null
          : ((await this.categories.requireCategories([input.categoryId], executor)).get(
              input.categoryId,
            ) ?? null);
      const transaction =
        input.linkTransactionId === undefined
          ? null
          : await this.transactions.requireOne(input.linkTransactionId, executor);

      if (account?.isArchived) throw new RecurrenceAccountArchivedError();

      const startsMonth = input.startsMonth
        ? Month.of(input.startsMonth)
        : transaction
          ? Month.containing(BusinessDate.of(transaction.occurredOn))
          : this.firstMonthStillOpen(dateRule);
      assertSupportedMonth(startsMonth, 'startsMonth');

      const recurrence = Recurrence.create(
        {
          kind: input.kind,
          name: input.name,
          expectedAmount: Money.fromCents(input.expectedAmountCents),
          amountMode: input.amountMode,
          counterparty: input.counterparty,
          matchText: input.matchText,
          employmentRegime: input.employmentRegime,
          accountId: input.accountId,
          method: input.method,
          categoryId: input.categoryId,
          isSubscription: input.isSubscription,
          serviceSlug: input.serviceSlug,
          dateRule,
          maxPayments: input.maxPayments,
          startsMonth,
        },
        this.clock.now(),
      );
      if (category) recurrence.assertCategoryFits(category);

      if (transaction) {
        assertTransactionCanPayOccurrence({
          kind: recurrence.kind,
          amountCents: transaction.amountCents,
          nature: transaction.nature,
          counts: transaction.counts,
        });
        const [linked, linkedThere] = await Promise.all([
          this.occurrences.findLinkedTransactionIds([transaction.id], executor),
          this.linkedElsewhere?.findLinkedTransactionIds([transaction.id], executor),
        ]);
        if (linked.has(transaction.id) || linkedThere?.has(transaction.id)) {
          throw new OccurrenceTransactionAlreadyLinkedError();
        }
      }

      const { currentMonth, linked } = await this.activator.activate(
        { recurrence, transactions: transaction ? [transaction] : [] },
        executor,
      );
      const received = linked[0] ?? currentMonth;

      return {
        recurrence: toRecurrenceDto(recurrence),
        occurrence: received ? await this.builder.buildOne(received, executor) : null,
      };
    });
  }

  // With no first month asked, the recurrence starts this month, unless the window of this month
  // already closed (a day that has passed): it would be born late, so it starts the next month.
  private firstMonthStillOpen(dateRule: DateRule): Month {
    const today = this.clock.today();
    const current = Month.containing(today);
    const window = this.opener.windowOfRule(dateRule, current);

    return window.windowEndOn.isBefore(today) ? current.next() : current;
  }
}

export namespace CreateRecurrenceUseCase {
  export type Input = RecurrenceContract.CreateRequest;
  export type Output = RecurrenceContract.CreateResponse;
}
