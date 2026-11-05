import {
  categoryBreakdownDtoSchema,
  categoryBreakdownQuerySchema,
} from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.schema.ts';
import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import { http } from 'msw';

import { resolveBreakdownWindow } from '#mocks/dashboard/category-breakdown/resolve-breakdown-window.util.ts';
import { sumLines } from '#mocks/dashboard/month-summary/sum-lines.util.ts';
import { listMonthOccurrences } from '#mocks/recurrences/occurrence/list-month-occurrences.util.ts';
import { db } from '#mocks/state/mock-database.store.ts';
import { handleRoute } from '#mocks/support/http/handle-route.util.ts';
import {
  buildLines,
  type TransactionLine,
} from '#mocks/transactions/transaction/build-lines.util.ts';
import { competenceOn } from '#mocks/transactions/transaction/competence-on.util.ts';
import { isInReview } from '#mocks/transactions/transaction/is-in-review.util.ts';

const roundOne = (value: number) => Math.round(value * 10) / 10;

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

        const keys = new Set([...current, ...(previous ?? [])].map((line) => line.categoryId));
        const expenseItems: CategoryBreakdown.ExpenseItem[] = [...keys].map((categoryId) => {
          const mine = current.filter((line) => line.categoryId === categoryId);
          const spent = -mine.reduce((sum, line) => sum + line.amountCents, 0);
          const before = previous
            ? -previous
                .filter((line) => line.categoryId === categoryId)
                .reduce((sum, line) => sum + line.amountCents, 0)
            : null;

          return {
            categoryId,
            spentCents: spent,
            previousSpentCents: before,
            changeCents: before === null ? null : spent - before,
            changePct:
              before === null || before === 0 ? null : roundOne(((spent - before) / before) * 100),
            sharePct: total === 0 ? null : roundOne((spent / total) * 100),
            transactionCount: mine.length,
            latest: [...mine]
              .sort((a, b) => b.occurredOn.localeCompare(a.occurredOn))
              .slice(0, 3)
              .map((line) => ({
                transactionId: line.transactionId,
                description: line.description,
                occurredOn: line.occurredOn,
                amountCents: line.amountCents,
              })),
          };
        });
        expenseItems.sort(
          (a, b) =>
            Number(a.categoryId === null) - Number(b.categoryId === null) ||
            b.spentCents - a.spentCents,
        );

        // "Where it grew the most" needs a period before; over all the history there is none.
        const grown = expenseItems
          .filter(
            (item) =>
              item.categoryId !== null &&
              (item.previousSpentCents ?? 0) >= 2000 &&
              (item.changePct ?? 0) >= 10,
          )
          .sort((a, b) => (b.changeCents ?? 0) - (a.changeCents ?? 0))[0];

        // Income by source: what came in and what the recurrences still expect, per category.
        const incomeLines = lines.filter(
          (line) => line.nature === 'income' && inWindow(line, period.fromOn, period.untilOn),
        );
        // The recurrences expect money by the month; a period has no expectation.
        const occurrences = period.month
          ? listMonthOccurrences(db, period.month).filter(
              (item) => item.kind === 'income' && item.status !== 'skipped' && !item.carriedOver,
            )
          : [];
        const incomeKeys = new Set<string | null>([
          ...incomeLines.map((line) => line.categoryId),
          ...occurrences.map(
            (item) =>
              db.recurrences.find((rec) => rec.id === item.recurrenceId)?.categoryId ?? null,
          ),
        ]);
        const incomeItems: CategoryBreakdown.IncomeItem[] = [...incomeKeys].map((categoryId) => {
          const mine = occurrences.filter(
            (item) =>
              (db.recurrences.find((rec) => rec.id === item.recurrenceId)?.categoryId ?? null) ===
              categoryId,
          );
          const receivedCents = incomeLines
            .filter((line) => line.categoryId === categoryId)
            .reduce((sum, line) => sum + line.amountCents, 0);
          const expectedCents = Math.max(
            receivedCents,
            mine.reduce(
              (sum, item) => sum + Math.max(item.expectedAmountCents, item.receivedCents),
              0,
            ),
          );

          return {
            categoryId,
            receivedCents,
            expectedCents,
            transactionCount: incomeLines.filter((line) => line.categoryId === categoryId).length,
            pending: mine
              .filter((item) => item.remainingCents > 0)
              .map((item) => ({
                occurrenceId: item.id,
                recurrenceName: item.recurrenceName,
                remainingCents: item.remainingCents,
                expectedOn: item.expectedOn,
                status: item.status,
              })),
          };
        });
        incomeItems.sort((a, b) => b.expectedCents - a.expectedCents);

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
            receivedCents: sumLines(lines, 'income', period.fromOn, period.untilOn),
            expectedCents: incomeItems.reduce((sum, item) => sum + item.expectedCents, 0),
            items: incomeItems,
          },
        };
      },
    ),
  ),
];
