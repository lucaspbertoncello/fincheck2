import { sql, type RawBuilder } from 'kysely';

// SQL twin of `computeCompetenceOn`: the day it counts as spending. Without a plan it is
// `occurred_on`; an installment counts on the day of the purchase (`purchase_on` of its plan) in
// the month of its invoice, held at the end of that month (`min` of two texts `YYYY-MM-DD`
// compares them right). `transactionAlias` and `planAlias` are the aliases of `transactions` and of
// `installment_plans` (left joined) in the query.
export function competenceOnSql(transactionAlias: string, planAlias: string): RawBuilder<string> {
  const transaction = (name: string) => sql.ref(`${transactionAlias}.${name}`);
  const plan = (name: string) => sql.ref(`${planAlias}.${name}`);

  return sql<string>`(
    case
      when ${transaction('installment_plan_id')} is null or ${transaction('invoice_month')} is null
        then ${transaction('occurred_on')}
      else min(
        ${transaction('invoice_month')} || '-' || substr(${plan('purchase_on')}, 9, 2),
        date(${transaction('invoice_month')} || '-01', '+1 month', '-1 day')
      )
    end
  )`;
}
