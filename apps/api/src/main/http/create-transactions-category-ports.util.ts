import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ApplyRuleToHistoryUseCase } from '#/modules/transactions/application/category-rule-history/apply-rule-to-history.usecase.ts';
import { ListManualCategorizationsQuery } from '#/modules/transactions/application/category-rule-history/list-manual-categorizations.query.ts';
import { LoadRuleHistoryCandidatesQuery } from '#/modules/transactions/application/category-rule-history/load-rule-history-candidates.query.ts';
import { PreviewRuleHistoryQuery } from '#/modules/transactions/application/category-rule-history/preview-rule-history.query.ts';
import { GetTransactionUsageQuery } from '#/modules/transactions/application/category-usage/get-transaction-usage.query.ts';
import { KyselyTransactionRepository } from '#/modules/transactions/infra/transaction/transaction.repository.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// What `transactions` gives `categories`: the use of each category, tag and rule, the history that a
// rule previews and recategorizes, and what Lucas categorized by hand. Built apart from
// `createTransactionsModule` because `categories` needs these to be built, and `transactions`
// needs the readers of `categories` back: the two are plugged together in `createApp`.
export function createTransactionsCategoryPorts({
  db,
  clock,
}: {
  db: Kysely<Database>;
  clock: Clock;
}) {
  const candidates = new LoadRuleHistoryCandidatesQuery(db);

  return {
    usage: new GetTransactionUsageQuery(db),
    historyPreviewer: new PreviewRuleHistoryQuery(candidates),
    applyRuleToHistory: new ApplyRuleToHistoryUseCase(
      new KyselyTransactionRepository(db),
      candidates,
      clock,
    ),
    manualCategorizations: new ListManualCategorizationsQuery(db),
  };
}
