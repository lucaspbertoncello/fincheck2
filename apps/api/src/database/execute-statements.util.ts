import { sql, type Kysely } from 'kysely';

// Runs raw SQL statements in order, one by one (the SQLite driver takes a single statement per
// call). Migrations are written as plain DDL: `STRICT`, `CHECK` and partial indexes are clearer
// there than through the schema builder.
export async function executeStatements(db: Kysely<unknown>, statements: string[]): Promise<void> {
  for (const statement of statements) {
    await sql.raw(statement).execute(db);
  }
}
