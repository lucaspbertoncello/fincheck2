import type { Insertable, Selectable } from 'kysely';

import type { SyncAccountLinksTable } from '#/database/tables/sync/sync-account-links-table.type.ts';
import type { SyncConnectionsTable } from '#/database/tables/sync/sync-connections-table.type.ts';
import { AccountLink } from '#/modules/sync/domain/connection/account-link.value-object.ts';
import { Connection } from '#/modules/sync/domain/connection/connection.entity.ts';

// The aggregate as rows: one of `sync_connections` and the ones of `sync_account_links`.
export class ConnectionItem {
  static fromEntity(connection: Connection): ConnectionItem.Rows {
    return {
      connection: {
        id: connection.id,
        pluggy_item_id: connection.pluggyItemId,
        institution_code: connection.institutionCode,
        institution_name: connection.institutionName,
        status: connection.status,
        error_code: connection.errorCode,
        last_bank_update_at: connection.lastBankUpdateAt,
        last_success_at: connection.lastSuccessAt,
        history_status: connection.historyStatus,
        history_from_on: connection.historyFromOn,
        created_at: connection.createdAt,
        updated_at: connection.updatedAt,
      },
      links: connection.accountLinks.map((link) => ({
        pluggy_account_id: link.pluggyAccountId,
        pluggy_name: link.pluggyName,
        pluggy_type: link.pluggyType,
        connection_id: connection.id,
        account_id: link.accountId,
        number_hint: link.numberHint,
        cursor_on: link.cursorOn,
      })),
    };
  }

  static toDomain(
    row: Selectable<SyncConnectionsTable>,
    links: Selectable<SyncAccountLinksTable>[],
  ): Connection {
    return new Connection({
      id: row.id,
      pluggyItemId: row.pluggy_item_id,
      // The column is free text in the database; the application writes only the closed list.
      institutionCode: row.institution_code as Connection.Attributes['institutionCode'],
      institutionName: row.institution_name,
      status: row.status,
      errorCode: row.error_code as Connection.Attributes['errorCode'],
      lastBankUpdateAt: row.last_bank_update_at,
      lastSuccessAt: row.last_success_at,
      historyStatus: row.history_status,
      historyFromOn: row.history_from_on,
      accountLinks: links.map(
        (link) =>
          new AccountLink({
            pluggyAccountId: link.pluggy_account_id,
            pluggyName: link.pluggy_name,
            pluggyType: link.pluggy_type,
            accountId: link.account_id,
            numberHint: link.number_hint,
            cursorOn: link.cursor_on,
          }),
      ),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });
  }
}

export namespace ConnectionItem {
  export type Rows = {
    connection: Insertable<SyncConnectionsTable>;
    links: Insertable<SyncAccountLinksTable>[];
  };
}
