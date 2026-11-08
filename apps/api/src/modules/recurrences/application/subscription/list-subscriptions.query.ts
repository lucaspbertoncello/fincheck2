import { normalizeText } from '@fincheck/shared/common/text/normalize-text.util.ts';
import type { Subscription } from '@fincheck/shared/recurrences/subscription/subscription.type.ts';

import { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrenceTransactionReader } from '#/modules/recurrences/application/occurrence-payment/occurrence-transaction-reader.interface.ts';
import { toRecurrenceDto } from '#/modules/recurrences/application/recurrence/to-recurrence-dto.util.ts';
import type { SubscriptionChargeReader } from '#/modules/recurrences/application/subscription/subscription-charge-reader.interface.ts';
import type { SubscriptionSuggestionFinder } from '#/modules/recurrences/application/subscription/subscription-suggestion-finder.service.ts';
import type { Occurrence } from '#/modules/recurrences/domain/occurrence/occurrence.entity.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { Recurrence } from '#/modules/recurrences/domain/recurrence/recurrence.entity.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { containsAsWords } from '#/modules/recurrences/domain/subscription/contains-as-words.util.ts';
import { evaluateSubscription } from '#/modules/recurrences/domain/subscription/evaluate-subscription.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';
import type { Kysely } from 'kysely';
import type { Database } from '#/database/database.type.ts';

// How far back the charges of a subscription are read to find its last one.
const MONTHS_LOOKED_BACK = 13;

// The tab Assinaturas (BR-REC-017): the recurrences marked "É assinatura", with the state of the
// month and the warning that fits (price changed, did not charge, charged after it ended), the total
// of the active ones and the suggestions. A subscription is a mark on an expense recurrence, of any
// method. The charges of one are the debits tied to its occurrences plus the ones on its account
// and method that carry its text (the match text, or its name). The controller creates the missing
// occurrences first.
export class ListSubscriptionsQuery {
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly transactions: OccurrenceTransactionReader;
  private readonly charges: SubscriptionChargeReader;
  private readonly builder: OccurrenceDtoBuilder;
  private readonly suggestions: SubscriptionSuggestionFinder;
  private readonly clock: Clock;

  constructor(
    recurrences: RecurrenceRepository<Kysely<Database>>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    transactions: OccurrenceTransactionReader,
    charges: SubscriptionChargeReader,
    builder: OccurrenceDtoBuilder,
    suggestions: SubscriptionSuggestionFinder,
    clock: Clock,
  ) {
    this.recurrences = recurrences;
    this.occurrences = occurrences;
    this.transactions = transactions;
    this.charges = charges;
    this.builder = builder;
    this.suggestions = suggestions;
    this.clock = clock;
  }

  async execute(input: ListSubscriptionsQuery.Input): Promise<ListSubscriptionsQuery.Output> {
    const currentMonth = Month.containing(this.clock.today());
    const month = input.month === undefined ? currentMonth : Month.of(input.month);
    assertSupportedMonth(month, 'month');

    const marked = (
      await this.recurrences.findMany({ includeArchived: true, subscriptionsOnly: true })
    ).filter((recurrence) => recurrence.startsMonth.value <= month.value);
    const all = await this.occurrences.findByRecurrenceIds(
      marked.map((recurrence) => recurrence.id),
    );
    const ofMonth = all.filter((occurrence) => occurrence.month.equals(month));
    const views = await this.builder.views(ofMonth);
    const viewByRecurrence = new Map(views.map((view) => [view.recurrence.id, view]));

    const chargesByRecurrence = await this.chargesOf(marked, all, month);

    const items: (Subscription.Item & { ended: boolean })[] = [];
    for (const recurrence of marked) {
      const view = viewByRecurrence.get(recurrence.id);
      const endedAt = recurrence.pausedAt ?? recurrence.archivedAt;
      const evaluation = evaluateSubscription({
        month: month.value,
        currentMonth: currentMonth.value,
        expectedCents: recurrence.expectedAmount.cents,
        endedOn: endedAt === null ? null : businessDateOfInstant(endedAt).value,
        occurrenceStatus: view?.state.status ?? null,
        charges: chargesByRecurrence.get(recurrence.id) ?? [],
      });
      if (!evaluation) continue;

      const lastCharge = chargesByRecurrence.get(recurrence.id)?.at(-1);
      // A deleted recurrence shows its occurrence only when it is history.
      const shown =
        view && (!recurrence.isArchived() || view.occurrence.isHistory()) ? view : undefined;
      items.push({
        recurrence: {
          ...toRecurrenceDto(recurrence),
          occurrence: shown ? OccurrenceDtoBuilder.toDto(shown) : null,
        },
        chargeDay:
          recurrence.dateRule.day ??
          view?.occurrence.expectedOn?.day ??
          (lastCharge ? Number(lastCharge.occurredOn.slice(8, 10)) : 1),
        status: evaluation.status,
        lastChargeCents: evaluation.lastChargeCents,
        alert: evaluation.alert,
        ended: endedAt !== null,
      });
    }

    const sorted = items.toSorted(
      (a, b) =>
        Number(a.ended) - Number(b.ended) ||
        a.chargeDay - b.chargeDay ||
        a.recurrence.name.localeCompare(b.recurrence.name, 'pt-BR', { sensitivity: 'base' }),
    );
    const active = marked.filter((recurrence) => recurrence.isActive());
    const monthlyTotalCents = active.reduce(
      (total, recurrence) => total + recurrence.expectedAmount.cents,
      0,
    );

    return {
      summary: {
        activeCount: active.length,
        monthlyTotalCents,
        yearlyTotalCents: monthlyTotalCents * 12,
      },
      items: sorted.map((item) => ({
        recurrence: item.recurrence,
        chargeDay: item.chargeDay,
        status: item.status,
        lastChargeCents: item.lastChargeCents,
        alert: item.alert,
      })),
      suggestions: (await this.suggestions.find()).map((candidate) => candidate.suggestion),
    };
  }

  // The debits that belong to each subscription up to the end of the month, oldest first: the ones
  // tied to its occurrences and the ones on its account and method that carry its text.
  private async chargesOf(
    marked: Recurrence[],
    occurrences: Occurrence[],
    month: Month,
  ): Promise<Map<string, { transactionId: string; occurredOn: string; cents: number }[]>> {
    const monthEnd = month.lastDay().value;
    let from = month;
    for (let step = 0; step < MONTHS_LOOKED_BACK; step++) from = from.previous();

    const accountIds = [...new Set(marked.flatMap((recurrence) => recurrence.accountId ?? []))];
    const [byText, linkedSnapshots] = await Promise.all([
      accountIds.length === 0
        ? Promise.resolve([])
        : this.charges.listAccountCharges({
            accountIds,
            from: from.firstDay().value,
            to: monthEnd,
          }),
      this.transactions.findMany(
        occurrences.flatMap((occurrence) =>
          occurrence.payments.map((payment) => payment.transactionId),
        ),
      ),
    ]);

    const result = new Map<
      string,
      { transactionId: string; occurredOn: string; cents: number }[]
    >();
    for (const recurrence of marked) {
      const own = new Map<string, { transactionId: string; occurredOn: string; cents: number }>();

      const linkedIds = new Set(
        occurrences
          .filter((occurrence) => occurrence.recurrenceId === recurrence.id)
          .flatMap((occurrence) => occurrence.payments.map((payment) => payment.transactionId)),
      );
      for (const id of linkedIds) {
        const snapshot = linkedSnapshots.get(id);
        if (snapshot?.counts && snapshot.amountCents < 0 && snapshot.occurredOn <= monthEnd) {
          own.set(id, {
            transactionId: id,
            occurredOn: snapshot.occurredOn,
            cents: Math.abs(snapshot.amountCents),
          });
        }
      }

      const pattern = recurrence.matchText ?? normalizeText(recurrence.name);
      for (const charge of byText) {
        if (
          charge.accountId === recurrence.accountId &&
          charge.method === (recurrence.method ?? 'credit') &&
          containsAsWords(normalizeText(charge.description), pattern)
        ) {
          own.set(charge.transactionId, {
            transactionId: charge.transactionId,
            occurredOn: charge.occurredOn,
            cents: charge.amountCents,
          });
        }
      }

      result.set(
        recurrence.id,
        [...own.values()].toSorted(
          (a, b) =>
            a.occurredOn.localeCompare(b.occurredOn) ||
            a.transactionId.localeCompare(b.transactionId),
        ),
      );
    }

    return result;
  }
}

export namespace ListSubscriptionsQuery {
  export type Input = Subscription.ListQuery;
  export type Output = Subscription.ListResponse;
}
