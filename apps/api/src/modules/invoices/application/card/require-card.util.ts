import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CardReader } from '#/modules/invoices/application/card/card-reader.interface.ts';
import { CardNotFoundError } from '#/modules/invoices/domain/invoice/card-not-found.error.ts';

// The card of the id, or `CARD_NOT_FOUND` when the account does not exist or is not a card.
export async function requireCard(
  cards: CardReader,
  accountId: string,
  executor?: Kysely<Database>,
): Promise<CardReader.Card> {
  const card = await cards.findCard(accountId, executor);
  if (!card) throw new CardNotFoundError();

  return card;
}
