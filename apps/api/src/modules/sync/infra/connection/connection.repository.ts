import type { Kysely, Selectable } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncConnectionsTable } from '#/database/tables/sync/sync-connections-table.type.ts';
import type { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';
import type { ConnectionRepository } from '#/modules/sync/domain/connection/connection-repository.interface.ts';
import { ConnectionItem } from '#/modules/sync/infra/connection/connection.item.ts';

// The store of the connections on SQLite: the root and its links to the accounts of the Pluggy.
// Every method accepts the executor of a unit of work; without it, it uses the default connection.
export class KyselyConnectionRepository implements ConnectionRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async findById(id: string, executor: Kysely<Database> = this.db): Promise<Connection | null> {
    return this.findOne('id', id, executor);
  }

  async findByPluggyItemId(
    pluggyItemId: string,
    executor: Kysely<Database> = this.db,
  ): Promise<Connection | null> {
    return this.findOne('pluggy_item_id', pluggyItemId, executor);
  }

  async list(executor: Kysely<Database> = this.db): Promise<Connection[]> {
    const rows = await executor
      .selectFrom('sync_connections')
      .selectAll()
      .orderBy('created_at', 'asc')
      .orderBy('id', 'asc')
      .execute();

    return this.withLinks(rows, executor);
  }

  async save(connection: Connection, executor: Kysely<Database> = this.db): Promise<void> {
    const { connection: row, links } = ConnectionItem.fromEntity(connection);

    await executor
      .insertInto('sync_connections')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          institution_code: row.institution_code,
          institution_name: row.institution_name,
          status: row.status,
          error_code: row.error_code ?? null,
          last_bank_update_at: row.last_bank_update_at ?? null,
          last_success_at: row.last_success_at ?? null,
          history_status: row.history_status,
          history_from_on: row.history_from_on ?? null,
          updated_at: row.updated_at,
        }),
      )
      .execute();

    // The links the connection no longer has go; the others are written as they are.
    const kept = links.map((link) => link.pluggy_account_id);
    let removal = executor.deleteFrom('sync_account_links').where('connection_id', '=', row.id);
    if (kept.length > 0) removal = removal.where('pluggy_account_id', 'not in', kept);
    await removal.execute();

    for (const link of links) {
      await executor
        .insertInto('sync_account_links')
        .values(link)
        .onConflict((conflict) =>
          conflict.column('pluggy_account_id').doUpdateSet({
            pluggy_name: link.pluggy_name,
            pluggy_type: link.pluggy_type,
            connection_id: link.connection_id,
            account_id: link.account_id ?? null,
            number_hint: link.number_hint ?? null,
            cursor_on: link.cursor_on ?? null,
          }),
        )
        .execute();
    }
  }

  async findOwnersOfAccounts(
    accountIds: string[],
    executor: Kysely<Database> = this.db,
  ): Promise<Map<string, ConnectionRepository.Owner>> {
    const ids = [...new Set(accountIds)];
    if (ids.length === 0) return new Map();

    const rows = await executor
      .selectFrom('sync_account_links as link')
      .innerJoin('sync_connections as connection', 'connection.id', 'link.connection_id')
      .select([
        'link.account_id',
        'link.number_hint',
        'link.pluggy_type',
        'connection.id as connection_id',
        'connection.status',
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
                  connectionId: row.connection_id,
                  connectionStatus: row.status,
                  numberHint: row.number_hint,
                  pluggyType: row.pluggy_type,
                },
              ] as const,
            ],
      ),
    );
  }

  async releaseAccounts(accountIds: string[], executor: Kysely<Database> = this.db): Promise<void> {
    if (accountIds.length === 0) return;
    await executor.deleteFrom('sync_account_links').where('account_id', 'in', accountIds).execute();
  }

  private async findOne(
    column: 'id' | 'pluggy_item_id',
    value: string,
    executor: Kysely<Database>,
  ): Promise<Connection | null> {
    const row = await executor
      .selectFrom('sync_connections')
      .selectAll()
      .where(column, '=', value)
      .executeTakeFirst();
    if (!row) return null;

    const [connection] = await this.withLinks([row], executor);

    return connection ?? null;
  }

  private async withLinks(
    rows: Selectable<SyncConnectionsTable>[],
    executor: Kysely<Database>,
  ): Promise<Connection[]> {
    if (rows.length === 0) return [];
    const links = await executor
      .selectFrom('sync_account_links')
      .selectAll()
      .where(
        'connection_id',
        'in',
        rows.map((row) => row.id),
      )
      .orderBy('pluggy_name', 'asc')
      .orderBy('pluggy_account_id', 'asc')
      .execute();

    return rows.map((row) =>
      ConnectionItem.toDomain(
        row,
        links.filter((link) => link.connection_id === row.id),
      ),
    );
  }
}
