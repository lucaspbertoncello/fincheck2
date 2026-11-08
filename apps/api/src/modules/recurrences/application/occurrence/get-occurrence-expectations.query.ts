import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { OccurrenceRepository } from '#/modules/recurrences/domain/occurrence/occurrence-repository.interface.ts';
import type { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import type { Month } from '#/shared/date/month.value-object.ts';

type Expectation = {
  occurrenceId: string;
  recurrenceName: string;
  expectedOn: string | null;
  amountCents: number;
};

// The occurrences of expense recurrences on a card that are still expected and fall in an invoice
// (RF-INV-003): `invoices` asks it through its `RecurrenceExpectationReader`, which this class
// satisfies. An occurrence falls in the invoice its expected day falls in, by the cycle of the card
// (the function `invoiceMonthOf` that `invoices` hands in); with no day, in the invoice of its own
// month. It counts what is left of it while it is expected, partial or late; one confirmed or
// skipped counts nothing, and neither does one of a deleted recurrence. When the real charge comes
// and is tied to the occurrence, what is left shrinks, so the same expense never counts twice.
export class GetOccurrenceExpectationsQuery {
  private readonly db: Kysely<Database>;
  private readonly occurrences: OccurrenceRepository<Kysely<Database>>;
  private readonly builder: OccurrenceDtoBuilder;

  constructor(
    db: Kysely<Database>,
    occurrences: OccurrenceRepository<Kysely<Database>>,
    builder: OccurrenceDtoBuilder,
  ) {
    this.db = db;
    this.occurrences = occurrences;
    this.builder = builder;
  }

  async expectationsOf(
    query: {
      accountId: string;
      months: Month[];
      invoiceMonthOf: (date: BusinessDate) => Month;
    },
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, Expectation[]>> {
    const wanted = new Set(query.months.map((month) => month.value));
    const first = query.months.toSorted((a, b) => a.value.localeCompare(b.value))[0];
    const last = query.months.toSorted((a, b) => b.value.localeCompare(a.value))[0];
    if (!first || !last) return new Map();

    // An occurrence is at most a month away from the invoice it falls in.
    const candidates = await executor
      .selectFrom('recurrence_occurrences as o')
      .innerJoin('recurrences as r', 'r.id', 'o.recurrence_id')
      .select('o.id')
      .where('r.account_id', '=', query.accountId)
      .where('r.kind', '=', 'expense')
      .where('r.archived_at', 'is', null)
      .where('o.skipped_at', 'is', null)
      .where('o.settled_at', 'is', null)
      .where('o.month', '>=', first.previous().value)
      .where('o.month', '<=', last.next().value)
      .execute();
    const views = await this.builder.views(
      await this.occurrences.findByIds(
        candidates.map((row) => row.id),
        executor,
      ),
      executor,
    );

    const byMonth = new Map<string, Expectation[]>();
    for (const view of views) {
      const { occurrence, state, recurrence } = view;
      if (state.status !== 'expected' && state.status !== 'partial' && state.status !== 'late') {
        continue;
      }
      if (state.remainingCents <= 0) continue;

      const month = occurrence.expectedOn
        ? query.invoiceMonthOf(occurrence.expectedOn)
        : occurrence.month;
      if (!wanted.has(month.value)) continue;

      byMonth.set(month.value, [
        ...(byMonth.get(month.value) ?? []),
        {
          occurrenceId: occurrence.id,
          recurrenceName: recurrence.name,
          expectedOn: occurrence.expectedOn?.value ?? null,
          amountCents: state.remainingCents,
        },
      ]);
    }

    return byMonth;
  }
}
