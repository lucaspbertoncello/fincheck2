import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';

import type { AgendaOccurrenceReader } from '#/modules/dashboard/application/occurrence/agenda-occurrence-reader.interface.ts';
import type { ReviewReader } from '#/modules/dashboard/application/review/review-reader.interface.ts';
import type { SpendingLineReader } from '#/modules/dashboard/application/spending-line/spending-line-reader.interface.ts';
import { buildExpenseItems } from '#/modules/dashboard/domain/category-breakdown/build-expense-items.util.ts';
import { buildIncomeItems } from '#/modules/dashboard/domain/category-breakdown/build-income-items.util.ts';
import { computeBreakdownWindow } from '#/modules/dashboard/domain/category-breakdown/compute-breakdown-window.util.ts';
import { pickTopGrowth } from '#/modules/dashboard/domain/category-breakdown/pick-top-growth.util.ts';
import { computeIncomeExpectation } from '#/modules/dashboard/domain/month-summary/compute-income-expectation.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { assertSupportedDate } from '#/shared/date/assert-supported-date.util.ts';
import { assertSupportedMonth } from '#/shared/date/assert-supported-month.util.ts';
import { BusinessDate } from '#/shared/date/business-date.value-object.ts';
import { Month } from '#/shared/date/month.value-object.ts';

// Spending and income by category (BR-DSH-001, 005, 006, 007; BR-CAT-002), for the "Por categoria" of
// the Visão geral and of Transações. A month, a free period (`from` and `to`) or all the history.
// Spending by competence; each category against the same period before (none over all the
// history, where the comparison fields are null); "Sem categoria" is one more and closes the
// total. The expectation of income only exists for a month (the occurrences of the recurrences) and
// is the same number as the card "Receitas" of the summary. The controller creates the missing
// occurrences first.
export class GetCategoryBreakdownQuery {
  private readonly lines: SpendingLineReader;
  private readonly reviews: ReviewReader;
  private readonly occurrences: AgendaOccurrenceReader;
  private readonly clock: Clock;

  constructor(
    lines: SpendingLineReader,
    reviews: ReviewReader,
    occurrences: AgendaOccurrenceReader,
    clock: Clock,
  ) {
    this.lines = lines;
    this.reviews = reviews;
    this.occurrences = occurrences;
    this.clock = clock;
  }

  async execute(input: GetCategoryBreakdownQuery.Input): Promise<GetCategoryBreakdownQuery.Output> {
    const parse = (value: string | undefined, path: string) => {
      if (value === undefined) return undefined;
      const date = BusinessDate.of(value);
      assertSupportedDate(date, path);

      return date;
    };
    const month = input.month ? Month.of(input.month) : undefined;
    if (month) assertSupportedMonth(month, 'month');
    const window = computeBreakdownWindow({
      month,
      from: parse(input.from, 'from'),
      to: parse(input.to, 'to'),
      today: this.clock.today(),
    });

    // One read from the start of the period before to the end of the month (or of the period), cut
    // in memory into the windows. Over all the history there are no limits.
    const reviewPeriod = window.wholeMonth
      ? { from: window.wholeMonth.fromOn, to: window.wholeMonth.untilOn }
      : {
          ...(window.fromOn ? { from: window.fromOn } : {}),
          ...(window.untilOn ? { to: window.untilOn } : {}),
        };
    const readFrom = window.previous?.fromOn ?? window.fromOn ?? undefined;
    const readTo = window.wholeMonth?.untilOn ?? window.untilOn ?? undefined;
    const [lines, review, occurrences] = await Promise.all([
      this.lines.listLines({
        ...(readFrom !== undefined ? { from: readFrom } : {}),
        ...(readTo !== undefined ? { to: readTo } : {}),
      }),
      this.reviews.countInPeriod(reviewPeriod),
      month ? this.occurrences.listOfMonth(month.value) : Promise.resolve([]),
    ]);

    const within = (on: string, bounds: { fromOn: string | null; untilOn: string | null }) =>
      (bounds.fromOn === null || on >= bounds.fromOn) &&
      (bounds.untilOn === null || on <= bounds.untilOn);
    const expenseLines = lines.filter((line) => line.kind === 'expense');
    const incomeLines = lines.filter((line) => line.kind === 'income');
    const currentExpense = expenseLines.filter((line) => within(line.on, window));
    const received = incomeLines.filter((line) => within(line.on, window));

    const expenses = buildExpenseItems({
      current: currentExpense,
      previous: window.previous
        ? expenseLines.filter((line) => within(line.on, window.previous!))
        : null,
    });

    const monthOccurrences = occurrences.filter(
      (occurrence) =>
        occurrence.kind === 'income' && occurrence.status !== 'skipped' && !occurrence.carriedOver,
    );
    const expectation = window.wholeMonth
      ? computeIncomeExpectation({
          occurrences: monthOccurrences.map((occurrence) => ({
            expectedCents: occurrence.expectedAmountCents,
            receivedCents: occurrence.receivedCents,
            categoryId: occurrence.categoryId,
            paymentTransactionIds: occurrence.payments.map((payment) => payment.transactionId),
          })),
          monthIncome: incomeLines
            .filter((line) => within(line.on, window.wholeMonth!))
            .map((line) => ({
              transactionId: line.transactionId,
              cents: line.amountCents,
              categoryId: line.categoryId,
            })),
        })
      : null;
    const incomeItems = buildIncomeItems({
      received: received.map((line) => ({
        transactionId: line.transactionId,
        cents: line.amountCents,
        categoryId: line.categoryId,
      })),
      expectation,
      occurrences: monthOccurrences,
    });

    const firstMonth =
      [...currentExpense, ...received].map((line) => line.on.slice(0, 7)).toSorted()[0] ?? null;

    return {
      month: window.month,
      comparedUntilOn: window.comparedUntilOn,
      firstMonth,
      expenses: {
        totalCents: expenses.totalCents,
        previousTotalCents: expenses.previousTotalCents,
        items: expenses.items,
        topGrowth: pickTopGrowth(expenses.items),
      },
      review,
      incomes: {
        receivedCents: incomeItems.reduce((total, item) => total + item.receivedCents, 0),
        expectedCents: incomeItems.reduce((total, item) => total + item.expectedCents, 0),
        items: incomeItems,
      },
    };
  }
}

export namespace GetCategoryBreakdownQuery {
  export type Input = CategoryBreakdown.Query;
  export type Output = CategoryBreakdown.Dto;
}
