import type { SyncSettings } from '@fincheck/shared/sync/settings/settings.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { CredentialsLoader } from '#/modules/sync/application/settings/credentials-loader.service.ts';
import type { SyncSettingsRepository } from '#/modules/sync/domain/settings/sync-settings-repository.interface.ts';

// "Pluggy conectado" or the step by step of the setup (RF-SYN-001). Configured only when the keys
// are saved and the secret decrypts on this PC; otherwise `{ configured: false, clientId: null,
// updatedAt: null }`. The secret never leaves.
export class GetSyncSettingsQuery {
  private readonly settings: SyncSettingsRepository<Kysely<Database>>;
  private readonly credentials: CredentialsLoader;

  constructor(settings: SyncSettingsRepository<Kysely<Database>>, credentials: CredentialsLoader) {
    this.settings = settings;
    this.credentials = credentials;
  }

  async execute(): Promise<GetSyncSettingsQuery.Output> {
    const [saved, readable] = await Promise.all([this.settings.find(), this.credentials.load()]);
    if (!saved || readable === null) return { configured: false, clientId: null, updatedAt: null };

    return { configured: true, clientId: saved.clientId, updatedAt: saved.updatedAt };
  }
}

export namespace GetSyncSettingsQuery {
  export type Output = SyncSettings.Dto;
}
