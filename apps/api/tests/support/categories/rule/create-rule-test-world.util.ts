import type { Insertable, Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { TransactionsTable } from '#/database/tables/transactions/transactions-table.type.ts';
import { insertTestAccount } from '#tests/support/accounts/account/insert-test-account.util.ts';
import { insertTestCategory } from '#tests/support/categories/category/insert-test-category.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { insertTestTransaction } from '#tests/support/transactions/transaction/insert-test-transaction.util.ts';

// The ground the tests of rules and suggestions stand on: an account, two expense categories, one
// income category, three tags (two in transport, one in delivery), and a way to put a transaction in the table with the few fields a
// rule looks at.
export async function createRuleTestWorld(db: Kysely<Database>) {
  const accountId = await insertTestAccount(db, { name: 'Conta corrente' });
  const otherAccountId = await insertTestAccount(db, { name: 'Outra conta' });
  const transport = await insertTestCategory(db, { kind: 'expense', name: 'Transporte teste' });
  const delivery = await insertTestCategory(db, { kind: 'expense', name: 'Delivery teste' });
  const salary = await insertTestCategory(db, { kind: 'income', name: 'Salário teste' });
  // The tags belong to a category: two in transport and one in delivery.
  const tripTag = await insertTestTag(db, { name: 'viagem teste', category_id: transport });
  const workTag = await insertTestTag(db, { name: 'trabalho teste', category_id: transport });
  const deliveryTag = await insertTestTag(db, { name: 'entrega teste', category_id: delivery });

  const addTransaction = (
    description: string,
    overrides: Partial<Insertable<TransactionsTable>> = {},
  ) =>
    insertTestTransaction(db, overrides.account_id ?? accountId, {
      description,
      search_text: description.toUpperCase(),
      ...overrides,
    });

  const tagsOf = async (transactionId: string) =>
    (
      await db
        .selectFrom('transaction_tags')
        .select('tag_id')
        .where('transaction_id', '=', transactionId)
        .execute()
    )
      .map((row) => row.tag_id)
      .sort();

  const categoryOf = (transactionId: string) =>
    db
      .selectFrom('transactions')
      .select(['category_id', 'category_source', 'category_rule_id'])
      .where('id', '=', transactionId)
      .executeTakeFirstOrThrow();

  return {
    accountId,
    otherAccountId,
    transport,
    delivery,
    salary,
    tripTag,
    workTag,
    deliveryTag,
    addTransaction,
    tagsOf,
    categoryOf,
  };
}
