import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { SyncSettings } from '#/modules/sync/domain/settings/sync-settings.entity.ts';
import type { SyncSettingsRepository } from '#/modules/sync/domain/settings/sync-settings-repository.interface.ts';
import { SyncSettingsItem } from '#/modules/sync/infra/settings/sync-settings.item.ts';

// The store of the keys of the Pluggy on SQLite: the single row. Every method accepts the executor
// of a unit of work; without it, it uses the default connection.
export class KyselySyncSettingsRepository implements SyncSettingsRepository<Kysely<Database>> {
  private readonly db: Kysely<Database>;

  constructor(db: Kysely<Database>) {
    this.db = db;
  }

  async find(executor: Kysely<Database> = this.db): Promise<SyncSettings | null> {
    const row = await executor
      .selectFrom('sync_settings')
      .selectAll()
      .where('id', '=', 1)
      .executeTakeFirst();

    return row ? SyncSettingsItem.toDomain(row) : null;
  }

  async save(settings: SyncSettings, executor: Kysely<Database> = this.db): Promise<void> {
    const row = SyncSettingsItem.fromEntity(settings);

    await executor
      .insertInto('sync_settings')
      .values(row)
      .onConflict((conflict) =>
        conflict.column('id').doUpdateSet({
          client_id: row.client_id,
          client_secret_encrypted: row.client_secret_encrypted,
          updated_at: row.updated_at,
        }),
      )
      .execute();
  }
}
