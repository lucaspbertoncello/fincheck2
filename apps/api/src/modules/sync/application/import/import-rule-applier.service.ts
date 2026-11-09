import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncRules } from '#/modules/sync/application/import/sync-rules.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';

// The rules of category over the new transactions of the round (BR-CAT-004), after the detectors:
// only the ones that stayed a plain expense or income and have no category yet (one that took the
// place of a parcel Lucas categorized keeps his). The rules are loaded once and answered in memory;
// `transactions` writes (and still refuses what must not change). A transaction that Lucas edited
// is never new here, so it is never touched. Runs inside the unit of work of the round.
export class ImportRuleApplier {
  private readonly rules: SyncRules;
  private readonly transactions: SyncTransactions;

  constructor(rules: SyncRules, transactions: SyncTransactions) {
    this.rules = rules;
    this.transactions = transactions;
  }

  async apply(
    created: SyncTransactions.Created[],
    natures: ReadonlyMap<string, string>,
    executor: Kysely<Database>,
  ): Promise<{ changedCount: number }> {
    const candidates = created.filter(
      (item) =>
        item.categoryId === null &&
        ['expense', 'income'].includes(natures.get(item.transactionId) ?? ''),
    );
    if (candidates.length === 0) return { changedCount: 0 };

    const ruleSet = await this.rules.load(executor);
    const items: SyncTransactions.RuleItem[] = [];
    for (const item of candidates) {
      const nature = natures.get(item.transactionId);
      if (nature !== 'expense' && nature !== 'income') continue;
      const resolution = ruleSet.resolve({
        description: item.description,
        bankDescription: item.description,
        counterparty: item.counterparty,
        nature,
        accountId: item.accountId,
        amountCents: item.amountCents,
      });
      if (resolution) items.push({ transactionId: item.transactionId, ...resolution });
    }
    if (items.length === 0) return { changedCount: 0 };

    return this.transactions.applyRules({ items }, executor);
  }
}
