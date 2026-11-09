import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// What `sync` asks of `categories`: the rules of category ready to answer for each new transaction
// without going back to the database (BR-CAT-004). The owner is `categories`, which `main` wires here.
export interface SyncRules {
  load(executor?: Kysely<Database>): Promise<SyncRules.RuleSet>;
}

export namespace SyncRules {
  export type Candidate = {
    // In use.
    description: string;
    bankDescription: string | null;
    counterparty: string | null;
    nature: 'expense' | 'income';
    accountId: string;
    // With sign.
    amountCents: number;
  };

  export type Resolution = {
    // The rule that defined the category; null when only tags came out.
    ruleId: string | null;
    category: { id: string; kind: 'expense' | 'income'; isArchived: boolean } | null;
    tagIds: string[];
  };

  export type RuleSet = {
    // Null when no rule gives a category or a tag.
    resolve(candidate: Candidate): Resolution | null;
  };
}
