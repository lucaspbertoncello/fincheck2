import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createAppParts } from '#/main/http/create-app-parts.util.ts';
import { startBackupSchedule } from '#/main/schedules/backup.schedule.ts';
import { startRecurrencesSchedule } from '#/main/schedules/recurrences.schedule.ts';
import { startSyncSchedule } from '#/main/schedules/sync.schedule.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// What `main.ts` runs: the HTTP app and the tasks of the API, built from the same modules. The
// occurrences are made ready before this answers (so before the first request) and again every day,
// with the use case the recurrences module itself hands back. The daily backup starts too (it does
// not hold the answer; `backupStartup` is the promise of its first run). The sync closes the rounds
// the last process died in and runs at once the connections whose last round was more than an hour
// ago, then every hour (without holding the start: `syncInitialRun` is that first look, for a test
// to wait for). The tasks hold back while the restore of a backup swaps the database file. `stop`
// ends the tasks.
export async function buildApi(deps: {
  db: ReplaceableDatabase;
  localToken: string;
  clock?: Clock;
  log?: (message: string) => void;
  sync?: Parameters<typeof createAppParts>[0]['sync'];
}) {
  const clock = deps.clock ?? new SystemClock();
  const {
    app,
    gate,
    ensureOccurrences,
    runDailyBackup,
    runDueConnections,
    recoverInterruptedRuns,
  } = createAppParts({
    db: deps.db,
    localToken: deps.localToken,
    clock,
    ...(deps.sync ? { sync: deps.sync } : {}),
  });
  const log = deps.log ? { log: deps.log } : {};
  const isPaused = () => gate.isActive();
  const recurrences = await startRecurrencesSchedule({
    ensureOccurrences,
    clock,
    isPaused,
    ...log,
  });
  const backup = startBackupSchedule({ runDailyBackup, clock, isPaused, ...log });
  const sync = await startSyncSchedule({
    runDue: runDueConnections,
    recover: recoverInterruptedRuns,
    isPaused,
    ...log,
  });

  return {
    app,
    backupStartup: backup.startup,
    syncInitialRun: sync.initialRun,
    stop: () => {
      recurrences.stop();
      backup.stop();
      sync.stop();
    },
  };
}
