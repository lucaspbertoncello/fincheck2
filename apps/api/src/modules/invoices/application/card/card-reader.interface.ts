import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// Port to the cards of `accounts`: the closing and the due day that set the cycle. An id that is
// not a card is absent (the caller throws `CARD_NOT_FOUND`). The owner is `accounts`.
export interface CardReader {
  findCard(accountId: string, executor?: Kysely<Database>): Promise<CardReader.Card | null>;
  findCards(
    accountIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, CardReader.Card>>;
  // The cards that are not archived.
  listActiveCards(executor?: Kysely<Database>): Promise<CardReader.Card[]>;
}

export namespace CardReader {
  export type Card = { id: string; closingDay: number; dueDay: number; isArchived: boolean };
}
