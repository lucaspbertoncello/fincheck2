import type { RecoverInterruptedRunsUseCase } from '#/modules/sync/application/run/recover-interrupted-runs.usecase.ts';
import type { RunDueConnectionsUseCase } from '#/modules/sync/application/run/run-due-connections.usecase.ts';

// How often the connections are looked at. A connection runs when its last round began more than an
// hour ago (`RunDueConnectionsUseCase`), so looking every minute keeps the hour without drifting.
const CHECK_EVERY_MS = 60_000;

// The scheduled round of the sync (BR-SYN-003): every hour, for each connection that is not
// disconnected, and at once when the API starts if the last one was more than an hour ago. It first
// closes the rounds the last process died in the middle of. The first look does not hold the start of
// the API (the network can take long): `initialRun` is its promise. A look that finds the previous
// one still going does nothing, so rounds never pile up; one that fails is logged by its name only
// (never a message, which could carry data) and tried again at the next look. The cleaning of the old
// runs (the last 200 of each connection stay) is done by the round itself. Returns `stop`, which the
// shutdown calls.
export async function startSyncSchedule(deps: {
  runDue: Pick<RunDueConnectionsUseCase, 'run'>;
  recover: Pick<RecoverInterruptedRunsUseCase, 'execute'>;
  checkEveryMs?: number;
  // True while the backup restores the database: the look (and the first one, at start) does
  // nothing then, the same format as the other tasks of the clock.
  isPaused?: () => boolean;
  log?: (message: string) => void;
}): Promise<{ stop: () => void; initialRun: Promise<void> }> {
  const log = deps.log ?? ((message: string) => console.error(message));
  const report = (error: unknown) => {
    log(`sync schedule: ${error instanceof Error ? error.name : 'unknown failure'}`);
  };

  try {
    await deps.recover.execute();
  } catch (error) {
    report(error);
  }

  let busy = false;
  const look = async () => {
    if (busy || deps.isPaused?.()) return;
    busy = true;
    try {
      await deps.runDue.run({ onError: report });
    } catch (error) {
      report(error);
    } finally {
      busy = false;
    }
  };

  const initialRun = look();
  const timer = setInterval(() => void look(), deps.checkEveryMs ?? CHECK_EVERY_MS);
  // The timer alone does not keep the process alive.
  timer.unref();

  return { stop: () => clearInterval(timer), initialRun };
}
