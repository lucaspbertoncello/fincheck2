import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import type { SecretCipher } from '#/modules/sync/application/settings/secret-cipher.interface.ts';
import type { SyncSettingsRepository } from '#/modules/sync/domain/settings/sync-settings-repository.interface.ts';

// The keys of the Pluggy in clear text, for who needs to talk to it: only in memory, for the length
// of the call. Null when there are no keys saved, or when the secret does not decrypt here (the
// database restored on another PC or Windows user, a damaged row): either way the app asks for the
// keys again (BR-SYN-001; `configured: false`).
export class CredentialsLoader {
  private readonly settings: SyncSettingsRepository<Kysely<Database>>;
  private readonly cipher: SecretCipher;

  constructor(settings: SyncSettingsRepository<Kysely<Database>>, cipher: SecretCipher) {
    this.settings = settings;
    this.cipher = cipher;
  }

  async load(executor?: Kysely<Database>): Promise<BankDataProvider.Credentials | null> {
    const saved = await this.settings.find(executor);
    if (!saved) return null;

    try {
      const clientSecret = await this.cipher.decrypt(Buffer.from(saved.secretEncrypted));

      return { clientId: saved.clientId, clientSecret };
    } catch {
      return null;
    }
  }
}
