import { sql, type RawBuilder } from 'kysely';

// SQL twin of `Transaction.entersAccounts()`: not ignored, and not removed by the bank unless Lucas
// edited it. `alias` is the alias of `transactions` in the query. The test of consistency with the
// entity lives in `tests/integration/modules/transactions/application/transaction/`.
export function entersAccountsSql(alias: string): RawBuilder<boolean> {
  const column = (name: string) => sql.ref(`${alias}.${name}`);

  return sql<boolean>`(
    ${column('ignored_at')} is null
    and not (
      ${column('bank_removed_at')} is not null
      and not (
        ${column('bank_amount_cents')} is not null
        and (
          ${column('description')} <> ${column('bank_description')}
          or ${column('amount_cents')} <> ${column('bank_amount_cents')}
          or ${column('occurred_on')} <> ${column('bank_occurred_on')}
        )
      )
    )
  )`;
}
