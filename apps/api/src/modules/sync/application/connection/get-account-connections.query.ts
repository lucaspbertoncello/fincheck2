import type { Account } from '@fincheck/shared/accounts/account/account.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';

// The connection each account of the bank belongs to (status, error, last update of the bank), for
// the screens of accounts and cards (the faixa de progresso, the selos) and for the confirmation of
// excluding an account. `accounts` asks it through its `AccountConnectionReader`, which this class
// satisfies. An account that no link points to is absent.
export class GetAccountConnectionsQuery {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async connectionsOf(
    accountIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, Account.Connection>> {
    const ids = [...new Set(accountIds)];
    if (ids.length === 0) return new Map();

    const rows = await executor
      .selectFrom('sync_account_links as link')
      .innerJoin('sync_connections as connection', 'connection.id', 'link.connection_id')
      .select([
        'link.account_id',
        'connection.id',
        'connection.status',
        'connection.error_code',
        'connection.last_bank_update_at',
      ])
      .where('link.account_id', 'in', ids)
      .execute();

    return new Map(
      rows.flatMap((row) =>
        row.account_id === null
          ? []
          : [
              [
                row.account_id,
                {
                  connectionId: row.id,
                  status: row.status,
                  errorCode:
                    row.status === 'error'
                      ? (row.error_code as Account.Connection['errorCode'])
                      : null,
                  lastBankUpdateAt: row.last_bank_update_at,
                },
              ] as const,
            ],
      ),
    );
  }
}
