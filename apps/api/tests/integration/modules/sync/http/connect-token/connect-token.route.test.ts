import { connectTokenDtoSchema } from '@fincheck/shared/sync/connect-token/connect-token.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createSyncTestWorld } from '#tests/support/sync/connection/create-sync-test-world.util.ts';

describe('POST /sync/connect-token', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  it('answers 200 with the token of the widget and when it expires, and writes nothing', async () => {
    await world.saveKeys();

    const response = await world.send('POST', '/sync/connect-token');

    expect(response.status).toBe(200);
    expect(connectTokenDtoSchema.parse(await response.json())).toEqual({
      connectToken: 'connect-token-test',
      expiresAt: '2026-11-09T15:30:00.000Z',
    });
    expect(await world.database.db.selectFrom('sync_connections').selectAll().execute()).toEqual(
      [],
    );
  });

  it('authenticates with the keys that are saved', async () => {
    await world.saveKeys();
    world.provider.keysSeen.length = 0;

    await world.send('POST', '/sync/connect-token');

    expect(world.provider.keysSeen).toEqual([world.provider.validCredentials]);
  });

  it('answers 422 SYNC_NOT_CONFIGURED without keys', async () => {
    await world.expectError(
      await world.send('POST', '/sync/connect-token'),
      422,
      'SYNC_NOT_CONFIGURED',
    );
  });

  it('answers 422 SYNC_NOT_CONFIGURED when the secret does not decrypt on this PC', async () => {
    await world.saveKeys();
    world.cipher.breakDecrypt();

    await world.expectError(
      await world.send('POST', '/sync/connect-token'),
      422,
      'SYNC_NOT_CONFIGURED',
    );
  });

  it('answers 422 SYNC_CREDENTIALS_INVALID when the saved keys stopped being valid', async () => {
    await world.saveKeys();
    world.provider.validCredentials = { clientId: 'other', clientSecret: 'other' };

    await world.expectError(
      await world.send('POST', '/sync/connect-token'),
      422,
      'SYNC_CREDENTIALS_INVALID',
    );
  });

  it('answers 422 SYNC_PROVIDER_UNAVAILABLE when the Pluggy cannot be reached', async () => {
    await world.saveKeys();
    world.provider.fail('createConnectToken', 'unavailable');

    await world.expectError(
      await world.send('POST', '/sync/connect-token'),
      422,
      'SYNC_PROVIDER_UNAVAILABLE',
    );
  });

  it('answers 401 without the local token', async () => {
    await world.expectError(
      await world.send('POST', '/sync/connect-token', undefined, { [LOCAL_TOKEN_HEADER]: 'wrong' }),
      401,
      'LOCAL_TOKEN_INVALID',
    );
  });
});
