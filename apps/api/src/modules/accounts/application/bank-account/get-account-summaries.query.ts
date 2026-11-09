import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The name and the type of accounts, for the screen of connections (the accounts of each one and
// the candidates of a reconnection). Only what exists comes back.
export class GetAccountSummariesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async execute(
    accountIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, GetAccountSummariesQuery.Summary>> {
    const ids = [...new Set(accountIds)];
    if (ids.length === 0) return new Map();

    const rows = await executor
      .selectFrom('accounts')
      .select(['id', 'name', 'type', 'source', 'institution_code', 'institution_name'])
      .where('id', 'in', ids)
      .execute();

    return new Map(
      rows.map((row) => [
        row.id,
        {
          accountId: row.id,
          name: row.name,
          type: row.type,
          source: row.source,
          institutionCode: row.institution_code,
          institutionName: row.institution_name,
        },
      ]),
    );
  }
}

export namespace GetAccountSummariesQuery {
  export type Summary = {
    accountId: string;
    name: string;
    type: 'checking' | 'savings' | 'wallet' | 'credit_card';
    source: 'pluggy' | 'manual';
    institutionCode: string;
    institutionName: string | null;
  };
}
