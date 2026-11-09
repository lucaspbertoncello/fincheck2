import type { Institution } from '@fincheck/shared/accounts/institution/institution.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The accounts a reconnection may adopt (`sync`, "Reconectar sem duplicar"): the same bank and the
// same type, not archived. Whether one still has an active connection and whether its final fits is
// for the caller, who owns the links. A bank `other` is told by the name too.
export class ListBankAccountCandidatesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    input: ListBankAccountCandidatesQuery.Input,
    executor: Kysely<Database> = this.db,
  ): Promise<ListBankAccountCandidatesQuery.Candidate[]> {
    const rows = await executor
      .selectFrom('accounts as a')
      .leftJoin('credit_cards as c', 'c.account_id', 'a.id')
      .select(['a.id', 'a.name', 'a.type', 'a.source', 'a.institution_name', 'c.last4'])
      .where('a.type', '=', input.type)
      .where('a.institution_code', '=', input.institutionCode)
      .where('a.archived_at', 'is', null)
      .orderBy('a.created_at', 'asc')
      .orderBy('a.id', 'asc')
      .execute();

    return rows.map((row) => ({
      accountId: row.id,
      name: row.name,
      type: row.type,
      source: row.source,
      institutionName: row.institution_name,
      last4: row.last4,
    }));
  }
}

export namespace ListBankAccountCandidatesQuery {
  export type Input = {
    institutionCode: Institution.Code;
    type: 'checking' | 'savings' | 'credit_card';
  };

  export type Candidate = {
    accountId: string;
    name: string;
    type: 'checking' | 'savings' | 'wallet' | 'credit_card';
    source: 'pluggy' | 'manual';
    institutionName: string | null;
    last4: string | null;
  };
}
