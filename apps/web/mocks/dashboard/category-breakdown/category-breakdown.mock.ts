import {
  categoryBreakdownDtoSchema,
  categoryBreakdownQuerySchema,
} from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { http } from 'msw';

import { resolveBreakdownWindow } from '#mocks/dashboard/category-breakdown/resolve-breakdown-window.util.ts';
import { computeIncomeExpectation } from '#mocks/dashboard/month-summary/compute-income-expectation.util.ts';
import { roundPct } from '#mocks/dashboard/month-summary/round-pct.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import {
  buildLines,
  type TransactionLine,
} from '#mocks/transactions/transaction/build-lines.util.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';

function inWindow(line: TransactionLine, fromOn: string, untilOn: string): boolean {
  return line.competenceOn >= fromOn && line.competenceOn <= untilOn;
}

export const categoryBreakdownMock = [
  http.get(
    '/api/dashboard/categories',
    handleRoute(
      { query: categoryBreakdownQuerySchema, response: categoryBreakdownDtoSchema },
      ({ query }) => {
        const period = resolveBreakdownWindow(query);
        const lines = buildLines(db);
        const expenseLines = lines.filter((line) => line.nature === 'expense');
        const current = expenseLines.filter((line) =>
          inWindow(line, period.fromOn, period.untilOn),
        );
        // Over all the history there is no period before: no comparison at all (null fields).
        const previous = period.previous
          ? expenseLines.filter((line) =>
              inWindow(line, period.previous!.fromOn, period.previous!.untilOn),
            )
          : null;
        const total = -current.reduce((sum, line) => sum + line.amountCents, 0);
        const previousTotal = previous
          ? -previous.reduce((sum, line) => sum + line.amountCents, 0)
          : null;

        const spentBy = (list: TransactionLine[]) => {
          const byCategory = new Map<string | null, number>();
          for (const line of list) {
            byCategory.set(
              line.categoryId,
              (byCategory.get(line.categoryId) ?? 0) - line.amountCents,
            );
          }

          return byCategory;
        };
        const currentSpent = spentBy(current);
        const previousSpent = previous ? spentBy(previous) : null;

        // One item per category that has a line in the period (a refund bigger than the spending
        // keeps its sign and shows 0 % of the share, never negative).
        const expenseItems: CategoryBreakdown.ExpenseItem[] = [...currentSpent.entries()].map(
          ([categoryId, spent]) => {
            const mine = current.filter((line) => line.categoryId === categoryId);
            const before = previousSpent ? (previousSpent.get(categoryId) ?? 0) : null;

            return {
              categoryId,
              spentCents: spent,
              previousSpentCents: before,
              changeCents: before === null ? null : spent - before,
              changePct: before === null ? null : roundPct(spent - before, before),
              sharePct: roundPct(Math.max(spent, 0), total),
              transactionCount: new Set(mine.map((line) => line.transactionId)).size,
              latest: [...mine]
                .sort(
                  (a, b) =>
                    b.occurredOn.localeCompare(a.occurredOn) ||
                    a.transactionId.localeCompare(b.transactionId),
                )
                .slice(0, 3)
                .map((line) => ({
                  transactionId: line.transactionId,
                  description: line.description,
                  occurredOn: line.occurredOn,
                  amountCents: line.amountCents,
                })),
            };
          },
        );
        expenseItems.sort(
          (a, b) =>
            Number(a.categoryId === null) - Number(b.categoryId === null) ||
            b.spentCents - a.spentCents ||
            (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
        );

        // "Where it grew the most": at least R$ 20,00 before and a rise of 10 % or more, tested on
        // the cents (9,96 % is not 10 %), never on the rounded percentage.
        let grown: CategoryBreakdown.ExpenseItem | undefined;
        for (const item of expenseItems) {
          const before = item.previousSpentCents;
          const change = item.changeCents;
          if (item.categoryId === null || before === null || change === null) continue;
          if (before < 2000 || change <= 0 || change * 10 < before) continue;
          if (!grown || change > (grown.changeCents ?? 0)) grown = item;
        }

        // Income by source: what came in and what the month still expects, per category. A period
        // has no expectation.
        const incomeLines = lines.filter(
          (line) => line.nature === 'income' && inWindow(line, period.fromOn, period.untilOn),
        );
        const occurrences = period.month
          ? listMonthOccurrences(db, period.month).filter(
              (item) => item.kind === 'income' && item.status !== 'skipped' && !item.carriedOver,
            )
          : [];
        const categoryOfOccurrence = (item: { recurrenceId: string }) =>
          db.recurrences.find((rec) => rec.id === item.recurrenceId)?.categoryId ?? null;
        const expectation = period.month
          ? computeIncomeExpectation(occurrences, lines, period.month, categoryOfOccurrence)
          : null;
        const incomeKeys = new Set<string | null>([
          ...incomeLines.map((line) => line.categoryId),
          ...(expectation?.byCategory.keys() ?? []),
        ]);
        const incomeItems: CategoryBreakdown.IncomeItem[] = [...incomeKeys].map((categoryId) => {
          const mine = incomeLines.filter((line) => line.categoryId === categoryId);

          return {
            categoryId,
            receivedCents: mine.reduce((sum, line) => sum + line.amountCents, 0),
            expectedCents: expectation?.byCategory.get(categoryId) ?? 0,
            transactionCount: new Set(mine.map((line) => line.transactionId)).size,
            pending: occurrences
              .filter(
                (item) =>
                  categoryOfOccurrence(item) === categoryId &&
                  item.remainingCents > 0 &&
                  item.status !== 'confirmed',
              )
              .map((item) => ({
                occurrenceId: item.id,
                recurrenceName: item.recurrenceName,
                remainingCents: item.remainingCents,
                expectedOn: item.expectedOn,
                status: item.status,
              })),
          };
        });
        incomeItems.sort(
          (a, b) =>
            b.expectedCents - a.expectedCents ||
            b.receivedCents - a.receivedCents ||
            (a.categoryId ?? '').localeCompare(b.categoryId ?? ''),
        );

        const review = db.transactions.filter(
          (tx) =>
            isInReview(tx) &&
            (period.month
              ? competenceOn(db, tx).slice(0, 7) === period.month
              : competenceOn(db, tx) >= period.fromOn && competenceOn(db, tx) <= period.untilOn),
        );

        const firstMonth =
          [...current, ...incomeLines].map((line) => line.competenceOn.slice(0, 7)).sort()[0] ??
          null;

        return {
          month: period.month,
          comparedUntilOn: period.comparedUntilOn,
          firstMonth,
          expenses: {
            totalCents: total,
            previousTotalCents: previousTotal,
            items: expenseItems,
            topGrowth: grown
              ? {
                  categoryId: grown.categoryId,
                  changePct: grown.changePct,
                  changeCents: grown.changeCents ?? 0,
                }
              : null,
          },
          review: {
            count: review.length,
            totalCents: review.reduce((sum, tx) => sum + Math.abs(tx.amountCents), 0),
          },
          incomes: {
            receivedCents: incomeItems.reduce((sum, item) => sum + item.receivedCents, 0),
            expectedCents: incomeItems.reduce((sum, item) => sum + item.expectedCents, 0),
            items: incomeItems,
          },
        };
      },
    ),
  ),
];
