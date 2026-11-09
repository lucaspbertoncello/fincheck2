import type { SyncSettings as SyncSettingsContract } from '@fincheck/shared/sync/settings/settings.type.ts';
import type { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import type { BankDataProvider } from '#/modules/sync/application/provider/bank-data-provider.interface.ts';
import { translateProviderFailure } from '#/modules/sync/application/provider/translate-provider-failure.util.ts';
import type { SecretCipher } from '#/modules/sync/application/settings/secret-cipher.interface.ts';
import { SyncSettings } from '#/modules/sync/domain/settings/sync-settings.entity.ts';
import type { SyncSettingsRepository } from '#/modules/sync/domain/settings/sync-settings-repository.interface.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';

// "Salvar chaves" (RF-SYN-001, RNF-004): the Pluggy must accept the keys (`POST /auth`); only then
// is the secret ciphered with the DPAPI of this Windows user and saved, in the single row. Nothing is
// saved when it refuses (`SYNC_CREDENTIALS_INVALID`) or cannot be reached (`SYNC_PROVIDER_UNAVAILABLE`).
// Changing the keys touches no connection. The secret is never logged nor answered.
export class SaveSyncSettingsUseCase {
  private readonly settings: SyncSettingsRepository<Kysely<Database>>;
  private readonly provider: BankDataProvider;
  private readonly cipher: SecretCipher;
  private readonly clock: Clock;

  constructor(
    settings: SyncSettingsRepository<Kysely<Database>>,
    provider: BankDataProvider,
    cipher: SecretCipher,
    clock: Clock,
  ) {
    this.settings = settings;
    this.provider = provider;
    this.cipher = cipher;
    this.clock = clock;
  }

  async execute(input: SaveSyncSettingsUseCase.Input): Promise<SaveSyncSettingsUseCase.Output> {
    try {
      await this.provider.verifyCredentials(input);
    } catch (error) {
      throw translateProviderFailure(error);
    }
    const secretEncrypted = await this.cipher.encrypt(input.clientSecret);
    const saved = new SyncSettings({
      clientId: input.clientId,
      secretEncrypted,
      updatedAt: this.clock.now(),
    });
    await this.settings.save(saved);

    return { configured: true, clientId: saved.clientId, updatedAt: saved.updatedAt };
  }
}

export namespace SaveSyncSettingsUseCase {
  export type Input = SyncSettingsContract.SaveRequest;
  export type Output = SyncSettingsContract.Dto;
}
