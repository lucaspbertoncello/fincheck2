import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import BetterSqlite3 from 'better-sqlite3';

// Opens the SQLite file (creating its folder) with the pragmas the app depends on. Throws, closing
// the handle, when WAL or the foreign keys did not turn on. `mustExist` refuses to create a new
// empty file: a reopen after a swap must find the database or fail, never serve an empty one.
export function openSqliteDatabase(
  file: string,
  options: { mustExist?: boolean } = {},
): BetterSqlite3.Database {
  mkdirSync(dirname(file), { recursive: true });

  const sqlite = new BetterSqlite3(file, { fileMustExist: options.mustExist ?? false });
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  sqlite.pragma('busy_timeout = 5000');
  sqlite.pragma('synchronous = NORMAL');

  const journalMode: unknown = sqlite.pragma('journal_mode', { simple: true });
  const foreignKeys: unknown = sqlite.pragma('foreign_keys', { simple: true });
  if (journalMode !== 'wal' || foreignKeys !== 1) {
    sqlite.close();
    throw new Error(
      `SQLite pragmas not applied: journal_mode=${String(journalMode)}, foreign_keys=${String(foreignKeys)}`,
    );
  }

  return sqlite;
}
