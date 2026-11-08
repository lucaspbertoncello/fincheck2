import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { Account } from '#/modules/accounts/domain/account/account.entity.ts';
import type { AccountRepository } from '#/modules/accounts/domain/account/account-repository.interface.ts';

// What `invoices` needs to know of a card to work out its cycle: the closing and the due day, and
// whether it is archived. `invoices` asks it through its `CardReader`, which this class satisfies.
// An id that is not a card (or does not exist) is simply absent: the caller owns the error.
export class GetCardRefsQuery {
  private readonly accounts: AccountRepository<Kysely<Database>>;

  constructor(accounts: AccountRepository<Kysely<Database>>) {
    this.accounts = accounts;
  }

  async findCard(
    accountId: string,
    executor?: Kysely<Database>,
  ): Promise<GetCardRefsQuery.Card | null> {
    const account = await this.accounts.findById(accountId, executor);

    return account ? GetCardRefsQuery.toCard(account) : null;
  }

  async findCards(
    accountIds: string[],
    executor?: Kysely<Database>,
  ): Promise<Map<string, GetCardRefsQuery.Card>> {
    const wanted = new Set(accountIds);
    const accounts = await this.accounts.list({ includeArchived: true }, executor);
    const cards = new Map<string, GetCardRefsQuery.Card>();
    for (const account of accounts) {
      const card = wanted.has(account.id) ? GetCardRefsQuery.toCard(account) : null;
      if (card) cards.set(card.id, card);
    }

    return cards;
  }

  // The cards that are not archived (an archived card has no "open invoice" in the panels).
  async listActiveCards(executor?: Kysely<Database>): Promise<GetCardRefsQuery.Card[]> {
    const accounts = await this.accounts.list({ includeArchived: false }, executor);

    return accounts.flatMap((account) => GetCardRefsQuery.toCard(account) ?? []);
  }

  private static toCard(account: Account): GetCardRefsQuery.Card | null {
    if (!account.isCard() || account.creditCard === null) return null;

    return {
      id: account.id,
      closingDay: account.creditCard.closingDay,
      dueDay: account.creditCard.dueDay,
      isArchived: account.isArchived(),
    };
  }
}

export namespace GetCardRefsQuery {
  export type Card = { id: string; closingDay: number; dueDay: number; isArchived: boolean };
}
