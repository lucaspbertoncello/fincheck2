import { syncSettingsDtoSchema } from '@fincheck/shared/sync/settings/settings.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createSyncTestWorld } from '#tests/support/sync/connection/create-sync-test-world.util.ts';

describe('GET and PUT /sync/settings', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  const settingsRow = () =>
    world.database.db.selectFrom('sync_settings').selectAll().executeTakeFirst();

  describe('GET', () => {
    it('answers not configured when there are no keys', async () => {
      const response = await world.send('GET', '/sync/settings');

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ configured: false, clientId: null, updatedAt: null });
    });

    it('answers configured with the client id after the keys are saved, and never the secret', async () => {
      await world.saveKeys();

      const response = await world.send('GET', '/sync/settings');
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(syncSettingsDtoSchema.parse(JSON.parse(text))).toEqual({
        configured: true,
        clientId: 'client-id-test',
        updatedAt: '2026-11-09T15:00:00.000Z',
      });
      expect(text).not.toContain('client-secret-test');
    });

    it('a secret that does not decrypt here (another PC or Windows user) counts as not configured', async () => {
      await world.saveKeys();
      world.cipher.breakDecrypt();

      const response = await world.send('GET', '/sync/settings');

      expect(await response.json()).toEqual({ configured: false, clientId: null, updatedAt: null });
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send('GET', '/sync/settings', undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });

  describe('PUT', () => {
    it('saves the keys the Pluggy accepts: 200 with the client id and the instant, secret ciphered in the table', async () => {
      const response = await world.send('PUT', '/sync/settings', {
        clientId: 'client-id-test',
        clientSecret: 'client-secret-test',
      });
      const text = await response.text();

      expect(response.status).toBe(200);
      expect(JSON.parse(text)).toEqual({
        configured: true,
        clientId: 'client-id-test',
        updatedAt: '2026-11-09T15:00:00.000Z',
      });
      expect(text).not.toContain('client-secret-test');
      const row = await settingsRow();
      expect(row?.client_id).toBe('client-id-test');
      // The table holds the ciphered bytes: the clear secret is nowhere in the row.
      expect(Buffer.from(row?.client_secret_encrypted ?? '').includes('client-secret-test')).toBe(
        false,
      );
    });

    it('trims the spaces at the ends of the keys', async () => {
      const response = await world.send('PUT', '/sync/settings', {
        clientId: '  client-id-test ',
        clientSecret: ' client-secret-test  ',
      });

      expect(response.status).toBe(200);
      expect((await settingsRow())?.client_id).toBe('client-id-test');
    });

    it('replaces the keys it had (one row only) and leaves the connections alone', async () => {
      await world.saveKeys();
      const connection = await world.connect();
      world.provider.validCredentials = { clientId: 'new-id', clientSecret: 'new-secret' };

      const response = await world.send('PUT', '/sync/settings', {
        clientId: 'new-id',
        clientSecret: 'new-secret',
      });

      expect(response.status).toBe(200);
      expect(
        await world.database.db.selectFrom('sync_settings').selectAll().execute(),
      ).toHaveLength(1);
      expect((await world.connectionsOf()).map((item) => [item.id, item.status])).toEqual([
        [connection.id, 'active'],
      ]);
    });

    it.each([
      ['an empty client id', { clientId: '', clientSecret: 'secret' }],
      ['a client id of spaces', { clientId: '   ', clientSecret: 'secret' }],
      ['a client id of 101 characters', { clientId: 'x'.repeat(101), clientSecret: 'secret' }],
      ['an empty secret', { clientId: 'id', clientSecret: '' }],
      ['a secret of 201 characters', { clientId: 'id', clientSecret: 'x'.repeat(201) }],
      ['no secret', { clientId: 'id' }],
      ['no body at all', {}],
    ])('answers 400 for %s, and the Pluggy is not asked', async (_name, body) => {
      const response = await world.send('PUT', '/sync/settings', body);

      expect(response.status).toBe(400);
      expect((await response.json()) as { code: string }).toMatchObject({
        code: 'VALIDATION_FAILED',
      });
      expect(world.provider.calls).toEqual([]);
    });

    it('answers 422 SYNC_CREDENTIALS_INVALID when the Pluggy refuses the keys, and saves nothing', async () => {
      await world.expectError(
        await world.send('PUT', '/sync/settings', { clientId: 'wrong', clientSecret: 'wrong' }),
        422,
        'SYNC_CREDENTIALS_INVALID',
      );

      expect(await settingsRow()).toBeUndefined();
    });

    it('answers 422 SYNC_PROVIDER_UNAVAILABLE when the Pluggy cannot be reached, and saves nothing', async () => {
      world.provider.fail('verifyCredentials', 'unavailable');

      await world.expectError(
        await world.send('PUT', '/sync/settings', world.provider.validCredentials),
        422,
        'SYNC_PROVIDER_UNAVAILABLE',
      );

      expect(await settingsRow()).toBeUndefined();
    });

    it('a refusal keeps the keys that were saved', async () => {
      await world.saveKeys();

      await world.send('PUT', '/sync/settings', { clientId: 'wrong', clientSecret: 'wrong' });

      expect((await settingsRow())?.client_id).toBe('client-id-test');
    });

    it('answers 401 without the local token', async () => {
      await world.expectError(
        await world.send('PUT', '/sync/settings', world.provider.validCredentials, {
          [LOCAL_TOKEN_HEADER]: 'wrong',
        }),
        401,
        'LOCAL_TOKEN_INVALID',
      );
    });
  });
});
