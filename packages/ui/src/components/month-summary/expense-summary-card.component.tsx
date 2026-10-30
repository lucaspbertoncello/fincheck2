import { VariationBadge } from '#/components/chips/variation-badge.component.tsx';
import { capitalize } from '#/components/month-summary/capitalize.util.ts';
import { Money } from '#/components/money/money.component.tsx';
import { expenseBar } from '#/components/month-summary/expense-bar.util.ts';
import { MonthSummaryCard } from '#/components/month-summary/month-summary-card.component.tsx';
import { SignedMoney } from '#/components/month-summary/signed-money.component.tsx';
import { SummaryBar } from '#/components/month-summary/summary-bar.component.tsx';

type ExpenseSummaryCardProps = {
  spentCents: number;
  /** Spent in the previous month up to the same day. */
  previousSamePointCents: number;
  /** The whole previous month, the gray stretch of the bar. */
  previousTotalCents: number;
  /** Name of the previous month, lower case ("setembro"). */
  previousMonthLabel: string;
  label?: string;
  /** Makes the card a link (see `MonthSummaryCard`). */
  href?: string;
};

/**
 * "Despesas" card (components.md 3.2): spent so far against the same point of the previous month.
 * The badge is the shared `VariationBadge`, so it stays gray under 10% (ui adjustment 4).
 */
export function ExpenseSummaryCard({
  spentCents,
  previousSamePointCents,
  previousTotalCents,
  previousMonthLabel,
  label = 'Despesas',
  href,
}: ExpenseSummaryCardProps) {
  const deltaCents = spentCents - previousSamePointCents;
  const percent = previousSamePointCents > 0 ? (deltaCents / previousSamePointCents) * 100 : null;

  return (
    <MonthSummaryCard
      href={href}
      icon="receipt"
      label={label}
      badge={percent === null ? null : <VariationBadge percent={percent} />}
      value={<Money cents={spentCents} sign="none" />}
      subtext={
        deltaCents === 0 ? (
          `igual a ${previousMonthLabel}`
        ) : (
          <>
            <SignedMoney cents={deltaCents} /> que {previousMonthLabel}
          </>
        )
      }
      bar={
        <SummaryBar
          segments={expenseBar(spentCents, previousTotalCents)}
          label={`Gasto do mês contra ${previousMonthLabel} inteiro`}
        />
      }
      barLegend={`${capitalize(previousMonthLabel)} e o que passou dele`}
    />
  );
}
