import type { Recurrence as RecurrenceContract } from '@fincheck/shared/recurrences/recurrence/recurrence.type.ts';

import type { MonthOccurrenceLoader } from '#/modules/recurrences/application/occurrence/month-occurrence-loader.service.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// The two cards of Recorrências: "Receitas esperadas" and "Despesas fixas" (RF-REC-002). Only the
// occurrences of the month count, with the skipped ones out (even one that kept a payment) and the
// ones of a deleted recurrence out (the same set as the list of recurrences, which shows the live
// ones only, so "faltam" of the card closes with the list it opens); the late ones of earlier
// months are not here. All integer cents, summed from the occurrences, never stored. What is missing is the
// remaining of the pending, partial and late ones: a confirmed one has none left, even when it
// came in over the expected amount.
export class GetRecurrenceSummaryQuery {
  private readonly loader: MonthOccurrenceLoader;

  constructor(loader: MonthOccurrenceLoader) {
    this.loader = loader;
  }

  async execute(input: GetRecurrenceSummaryQuery.Input): Promise<GetRecurrenceSummaryQuery.Output> {
    const month = Month.of(input.month);
    assertSupportedMonth(month, 'month');

    const views = (await this.loader.load(month)).filter(
      (view) => view.state.status !== 'skipped' && !view.recurrence.isArchived(),
    );
    const incomes = views.filter((view) => view.recurrence.kind === 'income');
    const expenses = views.filter((view) => view.recurrence.kind === 'expense');
    const sum = (items: typeof views, pick: (view: (typeof views)[number]) => number) =>
      items.reduce((total, view) => total + pick(view), 0);

    return {
      incomes: {
        expectedCents: sum(incomes, (view) => view.occurrence.expectedAmount.cents),
        receivedCents: sum(incomes, (view) => view.state.receivedCents),
        missingCents: sum(incomes, (view) => view.state.remainingCents),
        count: incomes.length,
      },
      expenses: {
        expectedCents: sum(expenses, (view) => view.occurrence.expectedAmount.cents),
        paidCents: sum(expenses, (view) => view.state.receivedCents),
        missingCents: sum(expenses, (view) => view.state.remainingCents),
        paidCount: expenses.filter((view) => view.state.status === 'confirmed').length,
        lateCount: expenses.filter((view) => view.state.status === 'late').length,
        differentCount: expenses.filter(
          (view) => view.state.difference !== null && view.state.difference.decision === null,
        ).length,
        count: expenses.length,
      },
    };
  }
}

export namespace GetRecurrenceSummaryQuery {
  export type Input = RecurrenceContract.SummaryQuery;
  export type Output = RecurrenceContract.Summary;
}
