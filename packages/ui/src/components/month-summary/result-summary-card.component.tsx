import { Money } from '#/components/money/money.component.tsx';
import { MonthSummaryCard } from '#/components/month-summary/month-summary-card.component.tsx';
import { ResultBadge } from '#/components/month-summary/result-badge.component.tsx';
import { resultBar } from '#/components/month-summary/result-bar.util.ts';
import { SignedMoney } from '#/components/month-summary/signed-money.component.tsx';
import { SummaryBar } from '#/components/month-summary/summary-bar.component.tsx';
import { capitalize } from '#/components/month-summary/capitalize.util.ts';

type ResultSummaryCardProps = {
  receivedCents: number;
  spentCents: number;
  /** The result (received minus spent) of the previous month at the same point (BR-DSH-011). */
  previousResultCents: number;
  /** Name of the previous month, lower case ("setembro"). */
  previousMonthLabel: string;
  label?: string;
  /** Makes the card a link (see `MonthSummaryCard`). */
  href?: string;
};

/**
 * "Resultado do mês" card (components.md 3.2): received minus spent so far. Positive is green
 * with "+"; it is the only one of the three whose number carries a color.
 */
export function ResultSummaryCard({
  receivedCents,
  spentCents,
  previousResultCents,
  previousMonthLabel,
  label = 'Resultado do mês',
  href,
}: ResultSummaryCardProps) {
  const resultCents = receivedCents - spentCents;
  const positive = resultCents >= 0;

  return (
    <MonthSummaryCard
      href={href}
      icon="wallet"
      label={label}
      badge={<ResultBadge deltaCents={resultCents - previousResultCents} />}
      value={
        positive ? (
          <Money cents={resultCents} sign="plus" tone="income" />
        ) : (
          <Money cents={resultCents} sign="auto" />
        )
      }
      subtext={
        <>
          {capitalize(previousMonthLabel)} neste ponto: <SignedMoney cents={previousResultCents} />
        </>
      }
      bar={
        <SummaryBar
          segments={resultBar(receivedCents, spentCents)}
          label="Despesas e o que sobrou do que entrou"
        />
      }
      barLegend="Despesas e o que sobrou"
    />
  );
}
