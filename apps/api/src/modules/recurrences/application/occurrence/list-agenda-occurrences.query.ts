import type { Occurrence as OccurrenceContract } from '@fincheck/shared/recurrences/occurrence/occurrence.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { ListOccurrencesQuery } from '#/modules/recurrences/application/occurrence/list-occurrences.query.ts';
import type { MonthOccurrenceLoader } from '#/modules/recurrences/application/occurrence/month-occurrence-loader.service.ts';
import { OccurrenceDtoBuilder } from '#/modules/recurrences/application/occurrence/occurrence-dto-builder.service.ts';
import type { RecurrenceRepository } from '#/modules/recurrences/domain/recurrence/recurrence-repository.interface.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The occurrences for the agenda, the Livre and the timeline of `dashboard`, which asks them
// through its `AgendaOccurrenceReader` (this class satisfies it). Three reads, each with the name
// of the sender and the category of its recurrence (the occurrence does not carry them) and
// whether the recurrence is paused:
// - `listOfMonth`: the ones `GET /occurrences` gives (the month and, in the current one, the late
//   ones that came along from the last 3 months);
// - `listOpenDueBy`: the open ones of the month before and of the month after that still fall due
//   by the last day of a month (the 29th of last month, whose window runs on; the 1st of next
//   month that moved back to the 30th because the 1st is a Sunday);
// - `listSettledAround`: the confirmed ones of the 3 months before and of the month after, which
//   may have been paid in the month asked.
// It reads; the caller creates the missing occurrences first.
export class ListAgendaOccurrencesQuery {
  private readonly occurrences: ListOccurrencesQuery;
  private readonly loader: MonthOccurrenceLoader;
  private readonly recurrences: RecurrenceRepository<Kysely<Database>>;

  constructor(
    occurrences: ListOccurrencesQuery,
    loader: MonthOccurrenceLoader,
    recurrences: RecurrenceRepository<Kysely<Database>>,
  ) {
    this.occurrences = occurrences;
    this.loader = loader;
    this.recurrences = recurrences;
  }

  async listOfMonth(month: string): Promise<ListAgendaOccurrencesQuery.Item[]> {
    const { items } = await this.occurrences.execute({ month });
    if (items.length === 0) return [];

    const found = await this.recurrences.findByIds([
      ...new Set(items.map((occurrence) => occurrence.recurrenceId)),
    ]);
    const byId = new Map(found.map((recurrence) => [recurrence.id, recurrence]));

    return items.map((occurrence) => ({
      ...occurrence,
      counterparty: byId.get(occurrence.recurrenceId)?.counterparty ?? null,
      categoryId: byId.get(occurrence.recurrenceId)?.categoryId ?? null,
      recurrencePaused: byId.get(occurrence.recurrenceId)?.isPaused() ?? false,
    }));
  }

  // Open (not confirmed, not skipped), of a recurrence neither paused nor deleted, with a day on or
  // before the last day of `month`, taken from the month before and the month after it. The late
  // ones of the last 3 months that the current month already carries come here too: the caller
  // does not count one twice.
  async listOpenDueBy(month: string): Promise<ListAgendaOccurrencesQuery.Item[]> {
    const target = Month.of(month);
    const lastDay = target.lastDay().value;
    const views = await this.viewsOf([target.previous(), target.next()]);

    return views
      .filter(
        ({ occurrence, recurrence, state }) =>
          !recurrence.isPaused() &&
          !recurrence.isArchived() &&
          (state.status === 'expected' || state.status === 'partial' || state.status === 'late') &&
          occurrence.expectedOn !== null &&
          occurrence.expectedOn.value <= lastDay,
      )
      .map((view) => ListAgendaOccurrencesQuery.toItem(view));
  }

  // The confirmed ones of the 3 months before `month` and of the one after it: an occurrence is
  // paid on a day that may be in another month than its own.
  async listSettledAround(month: string): Promise<ListAgendaOccurrencesQuery.Item[]> {
    const target = Month.of(month);
    const before = target.previous();
    const views = await this.viewsOf([
      before.previous().previous(),
      before.previous(),
      before,
      target.next(),
    ]);

    return views
      .filter(({ state }) => state.status === 'confirmed')
      .map((view) => ListAgendaOccurrencesQuery.toItem(view));
  }

  private async viewsOf(months: Month[]): Promise<OccurrenceDtoBuilder.View[]> {
    return (await Promise.all(months.map((month) => this.loader.load(month)))).flat();
  }

  private static toItem(view: OccurrenceDtoBuilder.View): ListAgendaOccurrencesQuery.Item {
    return {
      ...OccurrenceDtoBuilder.toDto(view),
      counterparty: view.recurrence.counterparty,
      categoryId: view.recurrence.categoryId,
      recurrencePaused: view.recurrence.isPaused(),
    };
  }
}

export namespace ListAgendaOccurrencesQuery {
  export type Item = OccurrenceContract.Dto & {
    counterparty: string | null;
    categoryId: string | null;
    // The recurrence is paused: what is left of it is no longer expected.
    recurrencePaused: boolean;
  };
}
