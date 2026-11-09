import { Kysely } from 'kysely';

import type { Database } from '#/database/database.type.ts';
import { ReplaceableSqliteDialect } from '#/database/replaceable/replaceable-sqlite-dialect.client.ts';
import { ReplaceableSqliteDriver } from '#/database/replaceable/replaceable-sqlite-driver.client.ts';

// The one Kysely the whole app shares, over a SQLite file that the restore of a backup can replace.
// Every module keeps this same object; `replaceFile` closes the handle under it, lets the caller
// swap the file and opens the handle again, so nobody holds a stale connection.
export class ReplaceableDatabase extends Kysely<Database> {
  readonly file: string;
  private readonly driver: ReplaceableSqliteDriver;

  constructor(file: string) {
    const driver = new ReplaceableSqliteDriver(file);
    super({ dialect: new ReplaceableSqliteDialect(driver) });
    this.file = file;
    this.driver = driver;
  }

  // False after a swap that could neither put the new file nor the old one in place: every query
  // fails ("The database is closed") instead of reading or creating a wrong database.
  get isOpen(): boolean {
    return this.driver.isOpen;
  }

  // Makes the handle read only (`true`) or writable again. It holds the connection, so it waits for
  // the transaction in flight; after it, a write fails with an error instead of being committed. The
  // restore uses it from the safety copy to the swap, so nothing can be written after the copy and
  // lost. A handle opened by a swap starts writable.
  async setWritesFrozen(frozen: boolean): Promise<void> {
    await this.connection().execute(() => {
      this.driver.currentDatabase().pragma(`query_only = ${frozen ? 'ON' : 'OFF'}`);

      return Promise.resolve();
    });
  }

  // Runs `swap` with the file closed. It holds the one connection of the driver, so it waits for the
  // query or transaction in flight and every other query waits for it (and then reads the new file).
  // `swap` changes the files on disk and may return an `undo` that puts the old ones back: it runs
  // if the new file cannot be opened. If `swap` itself throws it must have left the files as they
  // were. The handle is opened again in every case, but only if the file exists: if neither the new
  // file nor the old one can be opened, the database stays closed (`isOpen` false) and this throws.
  async replaceFile(swap: () => Promise<(() => Promise<void>) | undefined>): Promise<void> {
    await this.connection().execute(async () => {
      let undo: (() => Promise<void>) | undefined;
      try {
        this.driver.close();
        undo = await swap();
        this.driver.open();
      } catch (error) {
        if (undo) await undo().catch(() => undefined);
        try {
          this.driver.open();
        } catch {
          // Closed on purpose: the caller sees `isOpen` false and the original error.
        }
        throw error;
      }
    });
  }
}
