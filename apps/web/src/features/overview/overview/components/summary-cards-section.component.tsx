import {
  ExpenseSummaryCard,
  IncomeSummaryCard,
  MonthSummaryCards,
  ResultSummaryCard,
} from '@fincheck/ui';

import type {
  SummaryCardsData,
  SummaryLinks,
} from '#/features/overview/overview/overview.model.ts';

type SummaryCardsSectionProps = {
  data: SummaryCardsData;
  links: SummaryLinks;
};

/** Receitas, Despesas and Resultado do mês (RF-DSH-010): the numbers come ready from the API. Each card is a link to where the number comes from, filtered by the month. */
export function SummaryCardsSection({ data, links }: SummaryCardsSectionProps) {
  return (
    <MonthSummaryCards>
      <IncomeSummaryCard
        receivedCents={data.receivedCents}
        expectedCents={data.expectedCents}
        percent={data.incomePercent}
        barSegments={data.incomeBar}
        pendingNote={data.pendingNote}
        href={links.income}
      />
      <ExpenseSummaryCard
        spentCents={data.spentCents}
        previousSamePointCents={data.previousSamePointCents}
        barSegments={data.expenseBar}
        variationPercent={data.expenseVariationPercent}
        previousMonthLabel={data.previousMonthLabel}
        href={links.expense}
        reserveBadge
      />
      <ResultSummaryCard
        receivedCents={data.receivedCents}
        spentCents={data.spentCents}
        previousResultCents={data.previousResultCents}
        barSegments={data.resultBar}
        previousMonthLabel={data.previousMonthLabel}
        href={links.result}
      />
    </MonthSummaryCards>
  );
}
