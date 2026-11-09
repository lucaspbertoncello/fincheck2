import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SyncSettings } from '#/modules/sync/domain/settings/sync-settings.entity.ts';
import { KyselySyncSettingsRepository } from '#/modules/sync/infra/settings/sync-settings.repository.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

describe('KyselySyncSettingsRepository', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let repository: KyselySyncSettingsRepository;

  beforeEach(async () => {
    database = await createTestDatabase();
    repository = new KyselySyncSettingsRepository(database.db);
  });

  afterEach(async () => {
    await database.destroy();
  });

  const settings = (clientId: string, bytes: number[]) =>
    new SyncSettings({
      clientId,
      secretEncrypted: new Uint8Array(bytes),
      updatedAt: '2026-11-09T15:00:00.000Z',
    });

  it('has nothing before the keys are saved', async () => {
    expect(await repository.find()).toBeNull();
  });

  it('saves and reads the keys, the ciphered secret byte by byte', async () => {
    await repository.save(settings('client-1', [0, 255, 7, 128]));

    const found = await repository.find();

    expect(found?.clientId).toBe('client-1');
    expect([...(found?.secretEncrypted ?? [])]).toEqual([0, 255, 7, 128]);
    expect(found?.updatedAt).toBe('2026-11-09T15:00:00.000Z');
  });

  it('saving again replaces the row: there is one only', async () => {
    await repository.save(settings('client-1', [1]));
    await repository.save(settings('client-2', [2, 3]));

    const rows = await database.db.selectFrom('sync_settings').selectAll().execute();
    expect(rows).toHaveLength(1);
    expect((await repository.find())?.clientId).toBe('client-2');
  });
});
