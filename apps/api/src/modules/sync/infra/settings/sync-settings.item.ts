import type { Insertable, Selectable } from 'kysely';

import type { SyncSettingsTable } from '#/database/tables/sync/sync-settings-table.type.ts';
import { SyncSettings } from '#/modules/sync/domain/settings/sync-settings.entity.ts';

// The keys of the Pluggy as the row of `sync_settings` (always `id = 1`). The secret is the ciphered
// bytes; the column never holds it in clear text.
export class SyncSettingsItem {
  static fromEntity(settings: SyncSettings): Insertable<SyncSettingsTable> {
    return {
      id: 1,
      client_id: settings.clientId,
      client_secret_encrypted: Buffer.from(settings.secretEncrypted),
      updated_at: settings.updatedAt,
    };
  }

  static toDomain(row: Selectable<SyncSettingsTable>): SyncSettings {
    return new SyncSettings({
      clientId: row.client_id,
      secretEncrypted: new Uint8Array(row.client_secret_encrypted),
      updatedAt: row.updated_at,
    });
  }
}
