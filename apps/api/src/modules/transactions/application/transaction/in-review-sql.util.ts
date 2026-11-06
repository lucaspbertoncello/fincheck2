import { sql, type RawBuilder } from 'kysely';

import { entersAccountsSql } from '#/modules/transactions/application/transaction/enters-accounts-sql.util.ts';

// SQL twin of `Transaction.isInReview()` ("Para revisar", BR-CAT-008): expense or income that
// enters the accounts, with no category and no split. `alias` is the alias of `transactions`.
export function inReviewSql(alias: string): RawBuilder<boolean> {
  const column = (name: string) => sql.ref(`${alias}.${name}`);

  return sql<boolean>`(
    ${column('nature')} in ('expense', 'income')
    and ${entersAccountsSql(alias)}
    and ${column('category_id')} is null
    and not exists (
      select 1 from transaction_splits where transaction_splits.transaction_id = ${column('id')}
    )
  )`;
}
