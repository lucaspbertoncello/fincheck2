import { SqliteAdapter, SqliteIntrospector, SqliteQueryCompiler } from 'kysely';
import type {
  DatabaseIntrospector,
  Dialect,
  DialectAdapter,
  Driver,
  Kysely,
  QueryCompiler,
} from 'kysely';

import type { ReplaceableSqliteDriver } from '#/database/replaceable/replaceable-sqlite-driver.client.ts';

// The SQLite dialect of Kysely, with the driver that can swap the file under it.
export class ReplaceableSqliteDialect implements Dialect {
  private readonly driver: ReplaceableSqliteDriver;

  constructor(driver: ReplaceableSqliteDriver) {
    this.driver = driver;
  }

  createDriver(): Driver {
    return this.driver;
  }

  createQueryCompiler(): QueryCompiler {
    return new SqliteQueryCompiler();
  }

  createAdapter(): DialectAdapter {
    return new SqliteAdapter();
  }

  createIntrospector(db: Kysely<unknown>): DatabaseIntrospector {
    return new SqliteIntrospector(db);
  }
}
