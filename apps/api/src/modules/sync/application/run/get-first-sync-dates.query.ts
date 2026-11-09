import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { businessDateOfInstant } from '#/shared/date/business-date-of-instant.util.ts';

// The day (São Paulo) the Fincheck first saw each account of the Pluggy. `invoices` asks it through
// its `FirstSyncReader`, which this class satisfies: what the bank closed before that day was paid
// before the app existed. The anchor is a date that neither the `sync` trims (the rounds are
// trimmed, so the `first_connection` one is lost) nor a reconnection moves: the birth of the
// connection, which is the same instant as its first round, or, for an account the Pluggy created,
// the birth of the account when it is older (a new connection that adopts the account does not push
// the anchor forward). An account without a link is absent.
export class GetFirstSyncDatesQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async firstSyncDatesOf(
    accountIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, string>> {
    const ids = [...new Set(accountIds)];
    if (ids.length === 0) return new Map();

    const rows = await executor
      .selectFrom('sync_account_links as link')
      .innerJoin('sync_connections as connection', 'connection.id', 'link.connection_id')
      .innerJoin('accounts as account', 'account.id', 'link.account_id')
      .select([
        'link.account_id',
        'account.source',
        'account.created_at as account_created_at',
        'connection.created_at as connection_created_at',
      ])
      .where('link.account_id', 'in', ids)
      .execute();

    return new Map(
      rows.flatMap((row) => {
        if (row.account_id === null) return [];
        const born =
          row.source === 'pluggy' && row.account_created_at < row.connection_created_at
            ? row.account_created_at
            : row.connection_created_at;

        return [[row.account_id, businessDateOfInstant(born).value] as const];
      }),
    );
  }
}
