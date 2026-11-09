import BetterSqlite3 from 'better-sqlite3';

import type { BackupFileInspector } from '#/modules/backup/application/restore/backup-file-inspector.interface.ts';
import type { BackupFileFacts } from '#/modules/backup/domain/file/backup-file-facts.type.ts';

// Looks inside a file with its own read only SQLite handle: `integrity_check`, the tables and the
// migrations it records. The live database is never touched.
export class SqliteBackupFileInspector implements BackupFileInspector {
  // eslint-disable-next-line @typescript-eslint/require-await -- better-sqlite3 reads at once
  async inspect(file: string): Promise<BackupFileFacts> {
    let sqlite: BetterSqlite3.Database | null = null;
    try {
      sqlite = new BetterSqlite3(file, { readonly: true, fileMustExist: true });
      const integrity = sqlite.pragma('integrity_check', { simple: true });
      const tableNames = (
        sqlite.prepare(`SELECT name FROM sqlite_master WHERE type = 'table'`).all() as {
          name: string;
        }[]
      ).map((row) => row.name);
      const migrationNames = tableNames.includes('kysely_migration')
        ? (sqlite.prepare('SELECT name FROM kysely_migration').all() as { name: string }[]).map(
            (row) => row.name,
          )
        : [];

      return { readable: true, integrityOk: integrity === 'ok', tableNames, migrationNames };
    } catch {
      // Not a database, or too damaged to read.
      return { readable: false, integrityOk: false, tableNames: [], migrationNames: [] };
    } finally {
      sqlite?.close();
    }
  }
}
