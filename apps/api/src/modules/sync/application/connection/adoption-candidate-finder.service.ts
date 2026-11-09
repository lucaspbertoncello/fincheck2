import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncAccounts } from '#/modules/sync/application/import/sync-accounts.interface.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { findAdoptionCandidates } from '#/modules/sync/domain/import/find-adoption-candidates.util.ts';
import type { AdoptionCandidate } from '#/modules/sync/domain/import/find-adoption-candidates.util.ts';

// The accounts of Fincheck that an account of the Pluggy may be, on a reconnection: the ones of
// `accounts` of the same bank and type, joined to the link they have today (which `sync` owns), and
// filtered by the rule of `findAdoptionCandidates`. Both the round (adopt, create or wait) and the
// screen of connections (`pendingAccountMatches`) ask it, so they always agree.
export class AdoptionCandidateFinder {
  private readonly accounts: SyncAccounts;
  private readonly connections: ConnectionRepository<Kysely<Database>>;

  constructor(accounts: SyncAccounts, connections: ConnectionRepository<Kysely<Database>>) {
    this.accounts = accounts;
    this.connections = connections;
  }

  async find(
    input: AdoptionCandidateFinder.Input,
    executor?: Kysely<Database>,
  ): Promise<AdoptionCandidate[]> {
    const found = await this.accounts.findCandidates(
      { institutionCode: input.institutionCode, type: input.type },
      executor,
    );
    const owners = await this.connections.findOwnersOfAccounts(
      found.map((candidate) => candidate.accountId),
      executor,
    );

    return findAdoptionCandidates({
      incoming: {
        institutionName: input.institutionName,
        numberHint: input.numberHint,
        type: input.type,
      },
      institutionCode: input.institutionCode,
      candidates: found.map((candidate) => {
        const owner = owners.get(candidate.accountId);

        return {
          ...candidate,
          owner: owner
            ? {
                connectionId: owner.connectionId,
                connectionStatus: owner.connectionStatus,
                numberHint: owner.numberHint,
              }
            : null,
        };
      }),
    });
  }
}

export namespace AdoptionCandidateFinder {
  export type Input = {
    institutionCode: Institution.Code;
    institutionName: string;
    type: 'checking' | 'savings' | 'credit_card';
    numberHint: string | null;
  };
}
