import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { AdoptionCandidateFinder } from '#/modules/sync/application/connection/adoption-candidate-finder.service.ts';
import type { ImportConnectionUseCase } from '#/modules/sync/application/import/import-connection.usecase.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { computeCardDays } from '#/modules/sync/domain/import/compute-card-days.util.ts';

// The accounts of a round (`domain model.md` 5.3, first step): the account of the Pluggy that has a
// link is refreshed (balance as a fact, a card's missing data); one that has none looks for the
// account it already is ("Reconectar sem duplicar", `AdoptionCandidateFinder`): none, it is created;
// one, it is adopted (the old link goes, the account goes back to the bank); several, it waits for
// Lucas to choose (`accountId` null) and is not imported until then. A link that waits stays
// waiting. An archived account is ignored (BR-ACC-008). Runs inside the unit of work of the round.
export class BankAccountImporter {
  private readonly accounts: SyncAccounts;
  private readonly candidates: AdoptionCandidateFinder;
  private readonly connections: ConnectionRepository<Kysely<Database>>;

  constructor(
    accounts: SyncAccounts,
    candidates: AdoptionCandidateFinder,
    connections: ConnectionRepository<Kysely<Database>>,
  ) {
    this.accounts = accounts;
    this.candidates = candidates;
    this.connections = connections;
  }

  async import(
    connection: Connection,
    fetchedAccounts: ImportConnectionUseCase.FetchedAccount[],
    executor: Kysely<Database>,
  ): Promise<BankAccountImporter.Imported[]> {
    const imported: BankAccountImporter.Imported[] = [];

    for (const fetched of fetchedAccounts) {
      const { account } = fetched;
      const known = connection.linkOf(account.id);
      let link = new AccountLink({
        pluggyAccountId: account.id,
        pluggyName: account.name,
        pluggyType: account.type,
        accountId: known?.accountId ?? null,
        numberHint: account.numberHint ?? known?.numberHint ?? null,
        cursorOn: known?.cursorOn ?? null,
      });
      let isFresh = false;

      if (link.isPending() && !known) {
        const found = await this.candidates.find(
          {
            institutionCode: account.institution?.code ?? connection.institutionCode,
            institutionName: account.institution?.name ?? connection.institutionName,
            type: account.type,
            numberHint: account.numberHint,
          },
          executor,
        );
        const [only] = found;
        if (found.length === 0) {
          const created = await this.accounts.create(
            this.buildCreateInput(connection, fetched),
            executor,
          );
          link = link.withAccount(created.accountId);
          isFresh = true;
        } else if (only && found.length === 1) {
          await this.connections.releaseAccounts([only.accountId], executor);
          connection.unlinkAccount(only.accountId);
          link = link.withAccount(only.accountId);
        }
      }

      connection.putLink(link);
      if (link.accountId === null) continue;

      const refreshed = isFresh
        ? { isImported: true, isCard: account.type === 'credit_card' }
        : await this.accounts.refresh(
            {
              accountId: link.accountId,
              balanceCents: BankAccountImporter.balanceOf(fetched),
              card: account.card
                ? { last4: account.numberHint, limitCents: account.card.limitCents }
                : null,
            },
            executor,
          );
      if (!refreshed.isImported) continue;

      imported.push({ accountId: link.accountId, isCard: refreshed.isCard, fetched });
    }

    return imported;
  }

  // On a card, "the amount used" is recorded positive (accounts.md); elsewhere it is the balance.
  static balanceOf(fetched: ImportConnectionUseCase.FetchedAccount): number | null {
    const { balanceCents, type } = fetched.account;
    if (balanceCents === null) return null;

    return type === 'credit_card' ? Math.abs(balanceCents) : balanceCents;
  }

  buildCreateInput(
    connection: Connection,
    fetched: ImportConnectionUseCase.FetchedAccount,
  ): SyncAccounts.CreateInput {
    const { account } = fetched;
    const days = account.card
      ? computeCardDays({
          closingDay: account.card.closingDay,
          dueDay: account.card.dueDay,
          invoiceDueOns: fetched.invoices.map((invoice) => invoice.dueOn),
        })
      : null;

    return {
      type: account.type,
      name: account.name,
      institutionCode: account.institution?.code ?? connection.institutionCode,
      institutionName: account.institution?.name ?? connection.institutionName,
      balanceCents: BankAccountImporter.balanceOf(fetched),
      card:
        account.card && days
          ? {
              brand: account.card.brand,
              last4: account.numberHint,
              closingDay: days.closingDay,
              dueDay: days.dueDay,
              limitCents: account.card.limitCents,
            }
          : null,
    };
  }
}

export namespace BankAccountImporter {
  export type Imported = {
    accountId: string;
    isCard: boolean;
    fetched: ImportConnectionUseCase.FetchedAccount;
  };
}
