import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { backupStatusDtoSchema } from '@fincheck/shared/backup/backup-status/backup-status.schema.ts';
import BetterSqlite3 from 'better-sqlite3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type * as RenameModule from '#/modules/backup/infra/restore/rename-with-retry.util.ts';
import { recoverInterruptedSwap } from '#/database/recover-interrupted-swap.util.ts';
import { createBackupTestWorld } from '#tests/support/backup/backup/create-backup-test-world.util.ts';
import { insertTestTag } from '#tests/support/categories/tag/insert-test-tag.util.ts';

// Which renames of the swap fail, set by each test. Everything else goes through to the real one.
const failing = vi.hoisted(() => ({
  when: null as null | ((from: string, to: string) => boolean),
}));

vi.mock('#/modules/backup/infra/restore/rename-with-retry.util.ts', async (importOriginal) => {
  const real = await importOriginal<typeof RenameModule>();

  return {
    renameWithRetry: (from: string, to: string, attempts?: number) => {
      if (failing.when?.(from, to)) {
        return Promise.reject(Object.assign(new Error('EPERM: file is busy'), { code: 'EPERM' }));
      }

      return real.renameWithRetry(from, to, attempts);
    },
  };
});

describe('a restore whose swap fails after the 202', () => {
  let world: Awaited<ReturnType<typeof createBackupTestWorld>>;

  beforeEach(async () => {
    failing.when = null;
    world = await createBackupTestWorld();
  });

  afterEach(async () => {
    failing.when = null;
    await world.destroy();
  });

  const tagNames = async () =>
    (await world.database.db.selectFrom('tags').select('name').orderBy('name').execute()).map(
      (row) => row.name,
    );
  const dataFolder = () => dirname(world.database.file);
  const dataFiles = () =>
    readdirSync(dataFolder())
      .filter((name) => !name.endsWith('-wal') && !name.endsWith('-shm'))
      .sort();

  async function backupThenChange() {
    await insertTestTag(world.database.db, { name: 'before' });
    await world.choose();
    const { body } = await world.post('/backup/runs');
    await world.runPending();
    await insertTestTag(world.database.db, { name: 'after' });
    world.moveTo('2026-11-08T16:00:00.000Z');

    return (body as { fileName: string }).fileName;
  }

  it('keeps the old database, writes RESTORE_FAILED in lastError and opens the gate', async () => {
    const backupName = await backupThenChange();
    failing.when = (from, to) => from.endsWith('.restoring') && to === world.database.file;

    expect((await world.post('/backup/restore', { fileName: backupName })).status).toBe(202);
    await world.runPending();

    expect(await tagNames()).toEqual(['after', 'before']);
    expect(world.gate.isActive()).toBe(false);
    const status = backupStatusDtoSchema.parse((await world.get('/backup')).body);
    expect(status.running).toBe(false);
    expect(status.lastError).toEqual({
      at: '2026-11-08T16:00:00.000Z',
      code: 'RESTORE_FAILED',
    });
    expect(world.logs.some((message) => message.includes('the swap failed: EPERM'))).toBe(true);
    // Writable again, and nothing left beside the database.
    await insertTestTag(world.database.db, { name: 'still works' });
    expect(dataFiles()).toEqual(['test.db']);
  });

  it('does not serve an empty database when the old one cannot be put back either', async () => {
    const backupName = await backupThenChange();
    failing.when = (from, to) =>
      to === world.database.file && (from.endsWith('.restoring') || from.endsWith('.replaced'));

    expect((await world.post('/backup/restore', { fileName: backupName })).status).toBe(202);
    await world.runPending();

    // Nothing opened, nothing created: no empty database file, the gate stays closed (health is not
    // ok, the tasks hold back) and every query fails instead of answering from the wrong database.
    expect(world.database.db.isOpen).toBe(false);
    expect(existsSync(world.database.file)).toBe(false);
    expect(world.gate.isActive()).toBe(true);
    await expect(tagNames()).rejects.toThrow('The database is closed');
    expect((await world.get('/backup')).status).toBe(500);

    // The old database (with 'after') is kept under a name that nothing deletes, and the log says where.
    const preserved = readdirSync(dataFolder()).filter((name) => name.includes('.preserved-'));
    expect(preserved).toHaveLength(1);
    expect(existsSync(`${world.database.file}.replaced`)).toBe(false);
    const kept = new BetterSqlite3(join(dataFolder(), preserved[0] ?? ''), { readonly: true });
    try {
      expect(kept.prepare('select name from tags order by name').all()).toEqual([
        { name: 'after' },
        { name: 'before' },
      ]);
    } finally {
      kept.close();
    }
    expect(
      world.logs.some(
        (message) =>
          message.includes('NO DATABASE IS OPEN') &&
          message.includes(join(dataFolder(), preserved[0] ?? '')),
      ),
    ).toBe(true);

    // On the next start the old database comes back before anything opens the path.
    expect(recoverInterruptedSwap(world.database.file)).toBe(true);
    expect(existsSync(world.database.file)).toBe(true);
    const back = new BetterSqlite3(world.database.file, { readonly: true });
    try {
      expect(back.prepare('select count(*) as n from tags').get()).toEqual({ n: 2 });
    } finally {
      back.close();
    }
  });

  it('refuses writes from the safety copy to the swap, so nothing written meanwhile is lost', async () => {
    const backupName = await backupThenChange();

    expect((await world.post('/backup/restore', { fileName: backupName })).status).toBe(202);

    // The safety copy is made and the swap has not run: a write is refused, not committed and lost.
    await expect(insertTestTag(world.database.db, { name: 'too late' })).rejects.toThrow(
      /readonly/i,
    );
    expect(await tagNames()).toEqual(['after', 'before']);

    await world.runPending();

    expect(await tagNames()).toEqual(['before']);
    await insertTestTag(world.database.db, { name: 'after the restore' });
    expect(await tagNames()).toEqual(['after the restore', 'before']);
  });

  it('lets writes through again when the restore is refused before the swap', async () => {
    await insertTestTag(world.database.db, { name: 'live' });
    await world.choose();
    writeFileSync(
      join(world.folder, 'fincheck-2026-11-01-030000.db'),
      'not a database'.repeat(100),
    );

    const answer = await world.post('/backup/restore', {
      fileName: 'fincheck-2026-11-01-030000.db',
    });

    expect(answer.status).toBe(422);
    await insertTestTag(world.database.db, { name: 'writable' });
    expect(await tagNames()).toEqual(['live', 'writable']);
  });

  it('lets writes through again when the safety copy cannot be written', async () => {
    const backupName = await backupThenChange();
    const { mkdirSync } = await import('node:fs');
    mkdirSync(join(world.folder, 'fincheck-2026-11-08-130000.db.tmp'));

    const answer = await world.post('/backup/restore', { fileName: backupName });

    expect(answer.status).toBe(422);
    await insertTestTag(world.database.db, { name: 'writable' });
  });
});
