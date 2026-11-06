import type { TransactionBulk } from '@fincheck/shared/transactions/transaction-bulk/transaction-bulk.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { RuleHistoryPreviewer } from '#/modules/categories/application/rule/rule-history-previewer.interface.ts';

// Port to the use case of `transactions` that recategorizes the history with a rule. It runs inside
// the unit of work of the caller (the rule is created or applied and the history changes together,
// or nothing does) and returns the state before of each transaction that changed, for the undo.
export interface ApplyRuleToHistory {
  execute(
    input: { ruleId: string; definition: RuleHistoryPreviewer.Definition },
    executor: Kysely<Database>,
  ): Promise<{ changedCount: number; previous: TransactionBulk.PreviousState[] }>;
}
