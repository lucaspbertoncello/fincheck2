import {
  CategoryGroup,
  CategoryGroupList,
  ExpenseSummaryCard,
  IncomeSummaryCard,
  Money,
  MonthSummaryCard,
  SummaryBar,
} from '@fincheck/ui';

import type { ByCategoryView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';
import { UNCATEGORIZED_GROUP_ID } from '#/features/transactions/transaction-list/utils/build-category-groups.util.ts';

type ByCategoryProps = {
  data: ByCategoryView;
};

/** Expenses over all the history: no period before, so no comparison and a plain bar. */
function ExpenseCardWithoutComparison({ spentCents }: { spentCents: number }) {
  return (
    <MonthSummaryCard
      icon="receipt"
      label="Despesas"
      value={<Money cents={spentCents} sign="none" />}
      subtext="Sem período anterior para comparar"
      bar={
        <SummaryBar
          segments={[{ percent: 100, tone: 'strong' }]}
          label="Gasto em todo o histórico"
        />
      }
      barLegend="Gasto em todo o histórico"
    />
  );
}

/** Income of a period: what came in, without the expected of the recurrences (they are by month). */
function IncomeCardOfPeriod({
  receivedCents,
  sourceCount,
  legend,
}: {
  receivedCents: number;
  sourceCount: number;
  legend: string;
}) {
  return (
    <MonthSummaryCard
      icon="trend"
      label="Receitas"
      value={<Money cents={receivedCents} sign="none" />}
      subtext={sourceCount === 1 ? 'de 1 fonte' : `de ${sourceCount} fontes`}
      bar={<SummaryBar segments={[{ percent: 100, tone: 'gain' }]} label={legend} />}
      barLegend={legend}
    />
  );
}

/**
 * "Por categoria" (screens.md): the expense and income cards, then Despesas por categoria (each group
 * opens to its last transactions and "Ver as N transações na lista"; the group without category is
 * "Para revisar") and Receitas por fonte.
 */
export function ByCategory({ data }: ByCategoryProps) {
  const { expenseCard, incomeCard } = data;

  return (
    <div className="flex flex-col gap-s32">
      <div className="grid gap-s16 lg:grid-cols-2">
        {data.showExpenses ? (
          expenseCard.comparison ? (
            <ExpenseSummaryCard
              spentCents={expenseCard.spentCents}
              previousSamePointCents={expenseCard.comparison.previousSamePointCents}
              previousTotalCents={expenseCard.comparison.previousTotalCents}
              previousMonthLabel={expenseCard.comparison.previousLabel}
            />
          ) : (
            <ExpenseCardWithoutComparison spentCents={expenseCard.spentCents} />
          )
        ) : null}
        {data.showIncomes ? (
          incomeCard.expectedCents === null ? (
            <IncomeCardOfPeriod
              receivedCents={incomeCard.receivedCents}
              sourceCount={incomeCard.sourceCount}
              legend={incomeCard.receivedLegend}
            />
          ) : (
            <IncomeSummaryCard
              receivedCents={incomeCard.receivedCents}
              expectedCents={incomeCard.expectedCents}
            />
          )
        ) : null}
      </div>
      {data.showExpenses && data.expenses.length > 0 ? (
        <CategoryGroupList
          title="Despesas"
          subtitle="por categoria"
          count={data.expenses.length}
          noun={{ singular: 'categoria', plural: 'categorias' }}
          totalCents={data.expensesTotalCents}
          kind="expense"
        >
          {data.expenses.map((group) => (
            <CategoryGroup
              key={group.id}
              group={group}
              kind="expense"
              expanded={data.openGroupId === group.id}
              onExpandedChange={(open) => data.onOpenGroupChange(group.id, open)}
              onSeeAll={data.onSeeAll}
              onReview={group.id === UNCATEGORIZED_GROUP_ID ? data.onReview : undefined}
            />
          ))}
        </CategoryGroupList>
      ) : null}
      {data.showIncomes && data.incomes.length > 0 ? (
        <CategoryGroupList
          title="Receitas"
          subtitle="por fonte"
          count={data.incomes.length}
          noun={{ singular: 'fonte', plural: 'fontes' }}
          totalCents={data.incomesTotalCents}
          kind="income"
        >
          {data.incomes.map((group) => (
            <CategoryGroup
              key={group.id}
              group={group}
              kind="income"
              expanded={false}
              onExpandedChange={() => undefined}
            />
          ))}
        </CategoryGroupList>
      ) : null}
    </div>
  );
}
