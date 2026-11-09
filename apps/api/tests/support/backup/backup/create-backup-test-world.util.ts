import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { Hono } from 'hono';

import { createBackupModule } from '#/main/http/create-backup-module.util.ts';
import { handleError } from '#/main/http/handle-error.util.ts';
import { CountActiveAccountsQuery } from '#/modules/accounts/application/account/count-active-accounts.query.ts';
import type { BackgroundRunner } from '#/modules/backup/application/run/background-runner.type.ts';
import { GetTransactionOverviewQuery } from '#/modules/transactions/application/transaction-overview/get-transaction-overview.query.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';
import { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';
import { createTestDatabase } from '#tests/support/database/create-test-database.util.ts';

// 2026-11-08 12:00 in São Paulo (15:00 UTC).
const BACKUP_TEST_NOW = '2026-11-08T15:00:00.000Z';

// The backup module over a real SQLite file and real folders in the temp directory. The work that
// follows a 202 does not run by itself: the test calls `runPending` (so a state "running" can be
// looked at). `folder` is an empty folder made for the test; `choose` makes it the backup folder.
export async function createBackupTestWorld(options: { now?: string } = {}) {
  const database = await createTestDatabase();
  const root = mkdtempSync(join(tmpdir(), 'fincheck-backup-test-'));
  const folder = join(root, 'backups');
  mkdirSync(folder);

  let now = Date.parse(options.now ?? BACKUP_TEST_NOW);
  const clock: Clock = new SystemClock(() => now);
  const gate = new MaintenanceGate();
  const pending: (() => Promise<void>)[] = [];
  const runInBackground: BackgroundRunner = (task) => {
    pending.push(task);
  };
  const logs: string[] = [];

  const module = createBackupModule({
    db: database.db,
    clock,
    gate,
    transactionOverview: new GetTransactionOverviewQuery(database.db),
    activeAccounts: new CountActiveAccountsQuery(database.db),
    runInBackground,
    log: (message) => logs.push(message),
  });
  const app = new Hono().onError(handleError).route('/', module.routes);

  async function call(method: string, path: string, body?: unknown) {
    const response = await app.request(path, {
      method,
      ...(body === undefined
        ? {}
        : { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }),
    });
    const text = await response.text();

    return { status: response.status, body: (text ? JSON.parse(text) : null) as unknown };
  }

  return {
    database,
    root,
    folder,
    clock,
    gate,
    logs,
    runDailyBackup: module.runDailyBackup,
    moveTo(instant: string) {
      now = Date.parse(instant);
    },
    get: (path: string) => call('GET', path),
    put: (path: string, body: unknown) => call('PUT', path, body),
    post: (path: string, body?: unknown) => call('POST', path, body),
    choose: (path: string = folder) => call('PUT', '/backup/settings', { folderPath: path }),
    // Runs what a 202 left for later, in order.
    async runPending() {
      while (pending.length > 0) {
        const task = pending.shift();
        if (task) await task();
      }
    },
    hasPending: () => pending.length > 0,
    async destroy() {
      await database.destroy();
      rmSync(root, { recursive: true, force: true });
    },
  };
}
