import { rmSync } from 'node:fs';

import type BetterSqlite3 from 'better-sqlite3';
import { CompiledQuery } from 'kysely';
import type { DatabaseConnection, Driver } from 'kysely';

import { openSqliteDatabase } from '#/database/replaceable/open-sqlite-database.util.ts';
import { ReplaceableSqliteConnection } from '#/database/replaceable/replaceable-sqlite-connection.client.ts';

// Kysely's driver for one SQLite file whose handle can be closed and opened again under it. Like
// the stock SQLite driver it has one connection (Kysely lets one caller use it at a time, which is
// what makes `ReplaceableDatabase.replaceFile` safe); unlike it, the handle is not fixed for the
// life of the driver.
export class ReplaceableSqliteDriver implements Driver {
  readonly file: string;
  private database: BetterSqlite3.Database | null;
  private readonly connection: ReplaceableSqliteConnection;

  constructor(file: string) {
    this.file = file;
    this.database = openSqliteDatabase(file);
    this.connection = new ReplaceableSqliteConnection(this);
  }

  currentDatabase(): BetterSqlite3.Database {
    if (this.database === null) {
      throw new Error('The database is closed');
    }

    return this.database;
  }

  get isOpen(): boolean {
    return this.database !== null;
  }

  // Folds the WAL into the file and closes the handle, then removes the `-wal` and `-shm` files that
  // could be left: a new file must never meet the log of the old one. If the WAL cannot be folded
  // (another program reads the file, so SQLite answers busy) it throws and the handle stays open:
  // nothing is closed that could not be put back.
  close(): void {
    if (this.database === null) return;
    const database = this.database;
    const [result] = database.pragma('wal_checkpoint(TRUNCATE)') as { busy: number }[];
    if (result?.busy !== 0) {
      throw new Error('The write-ahead log could not be folded into the database file (busy)');
    }
    this.database = null;
    database.close();
    rmSync(`${this.file}-wal`, { force: true });
    rmSync(`${this.file}-shm`, { force: true });
  }

  // Opens the file again; it must exist (it never creates an empty database).
  open(): void {
    if (this.database !== null) return;
    this.database = openSqliteDatabase(this.file, { mustExist: true });
  }

  async init(): Promise<void> {
    // Opened by the constructor.
  }

  acquireConnection(): Promise<DatabaseConnection> {
    return Promise.resolve(this.connection);
  }

  async beginTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('begin'));
  }

  async commitTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('commit'));
  }

  async rollbackTransaction(connection: DatabaseConnection): Promise<void> {
    await connection.executeQuery(CompiledQuery.raw('rollback'));
  }

  async releaseConnection(): Promise<void> {
    // Nothing to give back.
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async destroy(): Promise<void> {
    try {
      this.close();
    } catch {
      // Busy: close anyway; SQLite folds the log itself when the last handle goes.
      this.database?.close();
      this.database = null;
    }
  }
}
