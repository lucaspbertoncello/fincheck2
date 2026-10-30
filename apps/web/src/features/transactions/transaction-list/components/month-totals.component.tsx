import { Icon, Money, type IconName } from '@fincheck/ui';

import type { MonthTotalsView } from '#/features/transactions/transaction-list/types/transaction-list-view.type.ts';

type TotalProps = {
  icon: IconName;
  label: string;
  cents: number;
  sign: 'plus' | 'minus' | 'none';
  tone?: 'income' | 'inherit';
};

function Total({ icon, label, cents, sign, tone = 'inherit' }: TotalProps) {
  return (
    <div className="flex min-w-0 flex-col gap-s4">
      <p className="flex items-center gap-s8 text-label text-fg-secondary">
        <Icon name={icon} size="sm" />
        {label}
      </p>
      <Money cents={cents} sign={sign} tone={tone} className="text-money-md" />
    </div>
  );
}

type MonthTotalsProps = {
  totals: MonthTotalsView;
};

/** The month at a glance: Despesas, Receitas and what is out of the account (transfers, invoice payments). */
export function MonthTotals({ totals }: MonthTotalsProps) {
  return (
    <section aria-label="Totais do mês" className="flex flex-wrap gap-x-s48 gap-y-s16">
      <Total icon="arrow-down-right" label="Despesas" cents={totals.expensesCents} sign="minus" />
      <Total
        icon="arrow-up-right"
        label="Receitas"
        cents={totals.incomesCents}
        sign="plus"
        tone="income"
      />
      <Total icon="transfer" label="Fora da conta" cents={totals.outsideCents} sign="none" />
    </section>
  );
}
