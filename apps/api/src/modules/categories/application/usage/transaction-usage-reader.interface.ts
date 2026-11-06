import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to what the transactions say about the use of a category, a tag and a rule (the counts of the
// screens). The owner is `transactions`; the `main` plugs its query in. Like every reader, it uses
// the executor it receives: inside a unit of work, reading by the root connection locks SQLite.
export interface TransactionUsageReader {
  // Transactions in each category (the ones with the category and the ones with a part in it, each
  // counted once, ignored included) and the latest `occurredOn` among them. A category nobody uses
  // is absent.
  ofCategories(
    categoryIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, { transactionCount: number; lastUsedOn: string | null }>>;
  // Transactions with each tag, ignored included. A tag nobody uses is absent.
  ofTags(tagIds: string[], executor?: Kysely<Database>): Promise<Map<string, number>>;
  // Transactions that each rule categorized. A rule that categorized none is absent.
  ofRules(ruleIds: string[], executor?: Kysely<Database>): Promise<Map<string, number>>;
}
