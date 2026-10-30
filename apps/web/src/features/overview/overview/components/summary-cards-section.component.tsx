import {
  ExpenseSummaryCard,
  IncomeSummaryCard,
  MonthSummaryCards,
  ResultSummaryCard,
} from '@fincheck/ui';

import type { SummaryCardsData } from '#/features/overview/overview/overview.model.ts';

type SummaryCardsSectionProps = {
  data: SummaryCardsData;
};

/** Receitas, Despesas and Resultado do mês (RF-DSH-010): the numbers come ready from the API. */
export function SummaryCardsSection({ data }: SummaryCardsSectionProps) {
  return (
    <MonthSummaryCards>
      <IncomeSummaryCard
        receivedCents={data.receivedCents}
        expectedCents={data.expectedCents}
        pendingNote={data.pendingNote}
      />
      <ExpenseSummaryCard
        spentCents={data.spentCents}
        previousSamePointCents={data.previousSamePointCents}
        previousTotalCents={data.previousTotalCents}
        previousMonthLabel={data.previousMonthLabel}
      />
      <ResultSummaryCard
        receivedCents={data.receivedCents}
        spentCents={data.spentCents}
        previousResultCents={data.previousResultCents}
        previousMonthLabel={data.previousMonthLabel}
      />
    </MonthSummaryCards>
  );
}
