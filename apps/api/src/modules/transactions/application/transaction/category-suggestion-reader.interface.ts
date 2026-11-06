import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the suggestions of category for the review queue ("Parece Restaurantes"): up to three
// active categories of the right kind, those Lucas already used for the same description first
// (`history`), then the ones a rule points to (`rule`). The owner is `categories`, which plugs
// its query in at `createApp` (unwired, there would be no suggestions).
export interface CategorySuggestionReader {
  suggestionsFor(
    items: CategorySuggestionReader.Item[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, CategorySuggestionReader.Suggestion[]>>;
}

export namespace CategorySuggestionReader {
  export type Item = {
    transactionId: string;
    // Normalized, without the "n/N" of an installment.
    description: string;
    amountCents: number;
  };

  export type Suggestion = { categoryId: string; reason: 'history' | 'rule' };
}
