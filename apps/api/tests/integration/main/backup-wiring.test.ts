import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { healthDtoSchema } from '@fincheck/shared/health/health/health.schema.ts';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildApi } from '#/main/build-api.util.ts';
import { LOCAL_TOKEN_HEADER } from '#/shared/local-token/local-token.constant.ts';
import { createTestApp } from '#tests/support/app/create-test-app.util.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';
import { createFixedClock } from '#tests/support/shared/clock/create-fixed-clock.util.ts';

// The backup module in the real app: the routes are mounted behind the token, the daily backup is
// tied to the schedule, and `GET /health` says the truth while a restore swaps the file.
describe('backup in the app', () => {
  let database: Awaited<ReturnType<typeof createTestDatabase>>;
  let root: string;
  let folder: string;
  const clock = createFixedClock('2026-11-08T15:00:00.000Z');

  beforeEach(async () => {
    database = await createTestDatabase();
    root = mkdtempSync(join(tmpdir(), 'fincheck-backup-app-'));
    folder = join(root, 'backups');
    mkdirSync(folder);
  });

  afterEach(async () => {
    await database.destroy();
    rmSync(root, { recursive: true, force: true });
  });

  async function waitFor(check: () => Promise<boolean>) {
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (await check()) return;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    throw new Error('timed out');
  }

  it('mounts the six routes behind the local token', async () => {
    const api = await buildApi({ db: database.db, localToken: 'token', clock });
    api.stop();

    for (const [method, path] of [
      ['GET', '/backup'],
      ['PUT', '/backup/settings'],
      ['POST', '/backup/runs'],
      ['GET', '/backup/files'],
      ['GET', '/backup/stats'],
      ['POST', '/backup/restore'],
    ] as const) {
      const refused = await api.app.request(path, { method });
      expect(refused.status, `${method} ${path} without the token`).toBe(401);
    }
    const stats = await api.app.request('/backup/stats', {
      headers: { [LOCAL_TOKEN_HEADER]: 'token' },
    });
    expect(stats.status).toBe(200);
  });

  it('runs the daily backup when the API starts and the folder has no file of today', async () => {
    await database.db
      .insertInto('backup_settings')
      .values({
        id: 1,
        folder_path: folder,
        last_error_at: null,
        last_error_code: null,
        updated_at: '2026-11-07T10:00:00.000Z',
      })
      .execute();

    const api = await buildApi({ db: database.db, localToken: 'token', clock });
    await api.backupStartup;
    api.stop();

    expect(readdirSync(folder)).toEqual(['fincheck-2026-11-08-120000.db']);
  });

  it('does nothing at start without a folder (and records no error)', async () => {
    const api = await buildApi({ db: database.db, localToken: 'token', clock });
    await api.backupStartup;
    api.stop();

    expect(await database.db.selectFrom('backup_settings').selectAll().execute()).toEqual([]);
  });

  it('says it is not ok from the answer of the restore until the file is swapped, then ok again with the data of the backup', async () => {
    const app = createTestApp(database.db, { clock });
    await insertTestTag(database.db, { name: 'before' });
    await app.request('/backup/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folderPath: folder }),
    });
    const run = await app.request('/backup/runs', { method: 'POST' });
    const { fileName } = (await run.json()) as { fileName: string };
    await waitFor(async () => {
      const status = (await (await app.request('/backup')).json()) as { running: boolean };
      return !status.running;
    });
    await insertTestTag(database.db, { name: 'after' });

    const restore = await app.request('/backup/restore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    expect(restore.status).toBe(202);
    // The swap has not run yet (it starts on the next turn of the event loop).
    const during = healthDtoSchema.parse(await (await app.request('/health')).json());
    expect(during).toEqual({ status: 'degraded', database: 'unavailable' });

    await waitFor(async () => {
      const health = healthDtoSchema.parse(await (await app.request('/health')).json());
      return health.status === 'ok';
    });

    const tags = await database.db.selectFrom('tags').select('name').execute();
    expect(tags.map((tag) => tag.name)).toEqual(['before']);
    expect(readdirSync(folder)).toHaveLength(2);
  });

  it('answers the other routes after the swap, from the connection the modules already held', async () => {
    const app = createTestApp(database.db, { clock });
    await insertTestTag(database.db, { name: 'before' });
    await app.request('/backup/settings', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ folderPath: folder }),
    });
    const { fileName } = (await (await app.request('/backup/runs', { method: 'POST' })).json()) as {
      fileName: string;
    };
    await waitFor(
      async () => !((await (await app.request('/backup')).json()) as { running: boolean }).running,
    );
    await insertTestTag(database.db, { name: 'after' });

    await app.request('/backup/restore', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ fileName }),
    });
    await waitFor(async () => {
      const health = healthDtoSchema.parse(await (await app.request('/health')).json());
      return health.status === 'ok';
    });
    const tags = await app.request('/tags');

    expect(tags.status).toBe(200);
    expect(
      ((await tags.json()) as { items: { name: string }[] }).items.map((tag) => tag.name),
    ).toEqual(['before']);
  });
});
