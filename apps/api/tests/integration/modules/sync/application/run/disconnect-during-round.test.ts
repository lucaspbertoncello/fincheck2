import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { BankProviderError } from '#/modules/sync/application/provider/bank-provider.error.ts';
import { translateProviderFailure } from '#/modules/sync/application/provider/translate-provider-failure.util.ts';
import { InProcessBackgroundRunner } from '#/modules/sync/infra/run/in-process-background-runner.service.ts';
import { createSyncTestWorld } from '#tests/support/sync/connection/create-sync-test-world.util.ts';
import { buildTestBankTransaction } from '#tests/support/sync/provider/build-test-bank-data.util.ts';

describe('a connection disconnected while its round fetches', () => {
  let world: Awaited<ReturnType<typeof createSyncTestWorld>>;

  beforeEach(async () => {
    world = await createSyncTestWorld();
    await world.saveKeys();
  });

  afterEach(async () => {
    await world.database.destroy();
  });

  it('writes nothing: the unit of work of the round is undone, the connection stays disconnected and the run ends as an error', async () => {
    const connection = await world.connect();
    world.provider.transactions.set('pluggy-account-checking', [
      buildTestBankTransaction({ id: 'a1' }),
    ]);
    const original = world.provider.listTransactions.bind(world.provider);
    world.provider.listTransactions = async (credentials, accountId, fromOn) => {
      // Lucas disconnects while the Pluggy is being read.
      await world.send('DELETE', `/sync/connections/${connection.id}`);

      return original(credentials, accountId, fromOn);
    };
    world.moveTo('2026-11-09T18:00:00.000Z');

    await world.retry(connection.id);

    const [after] = await world.connectionsOf();
    expect(after?.status).toBe('disconnected');
    expect(after?.errorCode).toBeNull();
    expect(
      await world.database.db
        .selectFrom('transactions')
        .selectAll()
        .where('origin', '=', 'bank')
        .execute(),
    ).toEqual([]);
    expect((await world.runsOf(connection.id))[0]).toMatchObject({ status: 'error' });
  });
});

describe('the small pieces around the round', () => {
  it('the runner of the background rounds starts the task and logs a failure by its name only', async () => {
    const logs: string[] = [];
    const runner = new InProcessBackgroundRunner((message) => logs.push(message));
    let ran = false;

    runner.start(async () => {
      ran = true;
      throw new TypeError('message with client-secret-test inside');
    });
    await vi.waitFor(() => expect(logs).toHaveLength(1));

    expect(ran).toBe(true);
    expect(logs).toEqual(['sync round: TypeError']);
  });

  it('a failure of the provider becomes the domain error of its kind, and anything else goes through untouched', () => {
    const other = new RangeError('x');

    expect(
      (translateProviderFailure(new BankProviderError('credentials_invalid')) as Error).name,
    ).toBe('SyncCredentialsInvalidError');
    expect((translateProviderFailure(new BankProviderError('item_not_found')) as Error).name).toBe(
      'SyncItemNotFoundError',
    );
    expect((translateProviderFailure(new BankProviderError('unavailable')) as Error).name).toBe(
      'SyncProviderUnavailableError',
    );
    expect(translateProviderFailure(other)).toBe(other);
  });
});
