import type { CategoryBreakdown } from '@fincheck/shared/dashboard/category-breakdown/category-breakdown.type.ts';
import type { MonthSummary } from '@fincheck/shared/dashboard/month-summary/month-summary.type.ts';
import type { SpendingCurve } from '@fincheck/shared/dashboard/spending-curve/spending-curve.type.ts';

import { buildExpenseBar } from '#/domain/dashboard/month-summary/rules/build-expense-bar.rule.ts';
import { buildIncomeBar } from '#/domain/dashboard/month-summary/rules/build-income-bar.rule.ts';
import { buildResultBar } from '#/domain/dashboard/month-summary/rules/build-result-bar.rule.ts';
import { getReceivedPercent } from '#/domain/dashboard/month-summary/rules/get-received-percent.rule.ts';
import { getSpentVariationPercent } from '#/domain/dashboard/month-summary/rules/get-spent-variation-percent.rule.ts';
import type { SummaryCardsData } from '#/features/overview/overview/overview.model.ts';
import { monthName } from '#/features/overview/overview/utils/month-name.util.ts';
import { shiftMonthKey } from '#/shared/utils/shift-month-key.util.ts';

/** "Maxxy ainda vem" / "2 ainda vêm": what is still to come in the Receitas card. */
function describePending(breakdown: CategoryBreakdown.Dto | undefined): string | undefined {
  const pending = breakdown?.incomes.items.flatMap((item) => item.pending) ?? [];
  const open = pending.filter((entry) => entry.remainingCents > 0);
  const [first] = open;
  if (!first) return undefined;
  return open.length === 1 ? `${first.recurrenceName} ainda vem` : `${open.length} ainda vêm`;
}

/** The whole previous month: the curve's last cumulative point, or the same-point value without it. */
function previousMonthTotal(curve: SpendingCurve.Dto | undefined, samePointCents: number): number {
  const last = curve?.days.findLast((day) => day.previousCents !== null)?.previousCents ?? 0;
  return Math.max(last, samePointCents);
}

/** Props of the three cards from the month summary; the curve and the breakdown only enrich them. */
export function buildSummaryCards(
  month: string,
  summary: MonthSummary.Dto,
  curve: SpendingCurve.Dto | undefined,
  breakdown: CategoryBreakdown.Dto | undefined,
): SummaryCardsData {
  return {
    receivedCents: summary.income.receivedCents,
    expectedCents: summary.income.expectedCents,
    pendingNote: describePending(breakdown),
    spentCents: summary.expenses.spentCents,
    previousSamePointCents: summary.expenses.previousSpentCents,
    incomePercent: getReceivedPercent(summary.income.receivedCents, summary.income.expectedCents),
    incomeBar: buildIncomeBar(summary.income.receivedCents, summary.income.expectedCents),
    expenseVariationPercent: getSpentVariationPercent(
      summary.expenses.spentCents,
      summary.expenses.previousSpentCents,
    ),
    expenseBar: buildExpenseBar(
      summary.expenses.spentCents,
      previousMonthTotal(curve, summary.expenses.previousSpentCents),
    ),
    resultBar: buildResultBar(summary.income.receivedCents, summary.expenses.spentCents),
    previousMonthLabel: monthName(shiftMonthKey(month, -1)),
    previousResultCents: summary.result.previousCents,
  };
}
