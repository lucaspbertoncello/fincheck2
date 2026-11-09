import { Hono } from 'hono';

import { listMigrationNames } from '#/database/list-migration-names.util.ts';
import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { BackupCatalog } from '#/modules/backup/application/file/backup-catalog.service.ts';
import { ListBackupFilesQuery } from '#/modules/backup/application/file/list-backup-files.query.ts';
import { GetBackupSettingsQuery } from '#/modules/backup/application/folder/get-backup-settings.query.ts';
import { UpdateBackupFolderUseCase } from '#/modules/backup/application/folder/update-backup-folder.usecase.ts';
import { RestoreBackupUseCase } from '#/modules/backup/application/restore/restore-backup.usecase.ts';
import type { BackgroundRunner } from '#/modules/backup/application/run/background-runner.type.ts';
import { BackupActivity } from '#/modules/backup/application/run/backup-activity.service.ts';
import { BackupWriter } from '#/modules/backup/application/run/backup-writer.service.ts';
import { RunDailyBackupUseCase } from '#/modules/backup/application/run/run-daily-backup.usecase.ts';
import { StartBackupRunUseCase } from '#/modules/backup/application/run/start-backup-run.usecase.ts';
import { GetBackupStatsQuery } from '#/modules/backup/application/stats/get-backup-stats.query.ts';
import type { ActiveAccountCounter } from '#/modules/backup/application/stats/active-account-counter.interface.ts';
import type { TransactionOverviewReader } from '#/modules/backup/application/stats/transaction-overview-reader.interface.ts';
import { GetBackupStatusQuery } from '#/modules/backup/application/status/get-backup-status.query.ts';
import { createBackupFileRoute } from '#/modules/backup/http/file/backup-file.route.ts';
import { ListBackupFilesController } from '#/modules/backup/http/file/list-backup-files.controller.ts';
import { createBackupFolderRoute } from '#/modules/backup/http/folder/backup-folder.route.ts';
import { UpdateBackupFolderController } from '#/modules/backup/http/folder/update-backup-folder.controller.ts';
import { createBackupRestoreRoute } from '#/modules/backup/http/restore/backup-restore.route.ts';
import { RestoreBackupController } from '#/modules/backup/http/restore/restore-backup.controller.ts';
import { createBackupRunRoute } from '#/modules/backup/http/run/backup-run.route.ts';
import { StartBackupRunController } from '#/modules/backup/http/run/start-backup-run.controller.ts';
import { createBackupStatsRoute } from '#/modules/backup/http/stats/backup-stats.route.ts';
import { GetBackupStatsController } from '#/modules/backup/http/stats/get-backup-stats.controller.ts';
import { createBackupStatusRoute } from '#/modules/backup/http/status/backup-status.route.ts';
import { GetBackupStatusController } from '#/modules/backup/http/status/get-backup-status.controller.ts';
import { FileSystemBackupFolder } from '#/modules/backup/infra/folder/backup-folder.gateway.ts';
import { ReplaceableDatabaseRestorer } from '#/modules/backup/infra/restore/database-restorer.gateway.ts';
import { SqliteBackupFileInspector } from '#/modules/backup/infra/restore/backup-file-inspector.gateway.ts';
import { SqliteDatabaseSnapshot } from '#/modules/backup/infra/run/database-snapshot.gateway.ts';
import { SqliteDatabaseSizeReader } from '#/modules/backup/infra/stats/database-size.gateway.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import type { MaintenanceGate } from '#/shared/maintenance/maintenance-gate.service.ts';

// Real one: the answer goes out first and the work starts on the next turn of the event loop.
const runAfterTheAnswer: BackgroundRunner = (task) => {
  setTimeout(() => void task(), 0);
};

// Builds the `backup` module by hand: its six routes and the use case of the daily task (which the
// schedule in `main/schedules/` calls). It reads the counts of the page Dados from `transactions` and
// `accounts` through ports, and it needs the replaceable connection (not a plain Kysely) because the
// restore swaps the database file under it. `gate` is what the restore closes so the tasks hold back
// and `GET /health` is not `ok` while the file is swapped.
export function createBackupModule(deps: {
  db: ReplaceableDatabase;
  clock: Clock;
  gate: MaintenanceGate;
  transactionOverview: TransactionOverviewReader;
  activeAccounts: ActiveAccountCounter;
  // Tests pass one that keeps the promise, to wait for the work that follows a 202.
  runInBackground?: BackgroundRunner;
  log?: (message: string) => void;
}) {
  const { db, clock, gate } = deps;
  const runInBackground = deps.runInBackground ?? runAfterTheAnswer;
  const log = deps.log ?? ((message: string) => console.error(message));

  const folder = new FileSystemBackupFolder();
  const catalog = new BackupCatalog(folder);
  const settings = new GetBackupSettingsQuery(db);
  const activity = new BackupActivity();
  const inspector = new SqliteBackupFileInspector();
  const writer = new BackupWriter(
    folder,
    new SqliteDatabaseSnapshot(db),
    inspector,
    db,
    clock,
    log,
  );
  const status = new GetBackupStatusQuery(settings, catalog, activity, clock);

  const routes = new Hono()
    .route('/', createBackupStatusRoute({ getBackupStatus: new GetBackupStatusController(status) }))
    .route(
      '/',
      createBackupFolderRoute({
        updateBackupFolder: new UpdateBackupFolderController(
          new UpdateBackupFolderUseCase(folder, db, status, clock),
        ),
      }),
    )
    .route(
      '/',
      createBackupRunRoute({
        startBackupRun: new StartBackupRunController(
          new StartBackupRunUseCase(settings, catalog, activity, writer, runInBackground, clock),
        ),
      }),
    )
    .route(
      '/',
      createBackupFileRoute({
        listBackupFiles: new ListBackupFilesController(new ListBackupFilesQuery(settings, catalog)),
      }),
    )
    .route(
      '/',
      createBackupStatsRoute({
        getBackupStats: new GetBackupStatsController(
          new GetBackupStatsQuery(
            new SqliteDatabaseSizeReader(db),
            deps.transactionOverview,
            deps.activeAccounts,
          ),
        ),
      }),
    )
    .route(
      '/',
      createBackupRestoreRoute({
        restoreBackup: new RestoreBackupController(
          new RestoreBackupUseCase({
            settings,
            catalog,
            activity,
            gate,
            inspector,
            restorer: new ReplaceableDatabaseRestorer(db),
            writer,
            listMigrationNames,
            db,
            runInBackground,
            clock,
            log,
          }),
        ),
      }),
    );

  return {
    routes,
    // The daily backup: the task of the clock calls it at 03:00 and when the API starts.
    runDailyBackup: new RunDailyBackupUseCase(settings, catalog, activity, writer, clock),
  };
}
