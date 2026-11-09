import { SelectQueryNode } from 'kysely';
import type { CompiledQuery, DatabaseConnection, QueryResult } from 'kysely';

import type { ReplaceableSqliteDriver } from '#/database/replaceable/replaceable-sqlite-driver.client.ts';

// The one connection of the driver. It does not keep the SQLite handle: it asks the driver for the
// current one on every query, so a swap of the file is seen by the next query.
export class ReplaceableSqliteConnection implements DatabaseConnection {
  private readonly driver: ReplaceableSqliteDriver;

  constructor(driver: ReplaceableSqliteDriver) {
    this.driver = driver;
  }

  // Async only to meet the interface of Kysely: better-sqlite3 answers at once.
  // eslint-disable-next-line @typescript-eslint/require-await
  async executeQuery<Row>(compiledQuery: CompiledQuery): Promise<QueryResult<Row>> {
    const { sql, parameters } = compiledQuery;
    const statement = this.driver.currentDatabase().prepare(sql);
    if (statement.reader) {
      return { rows: statement.all(...parameters) as Row[] };
    }

    const { changes, lastInsertRowid } = statement.run(...parameters);

    return {
      insertId: BigInt(lastInsertRowid),
      numAffectedRows: BigInt(changes),
      rows: [],
    };
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *streamQuery<Row>(compiledQuery: CompiledQuery): AsyncIterableIterator<QueryResult<Row>> {
    const { sql, parameters, query } = compiledQuery;
    if (!SelectQueryNode.is(query)) {
      throw new Error('The SQLite connection only streams select queries');
    }
    const statement = this.driver.currentDatabase().prepare(sql);
    for (const row of statement.iterate(...parameters)) {
      yield { rows: [row as Row] };
    }
  }
}
