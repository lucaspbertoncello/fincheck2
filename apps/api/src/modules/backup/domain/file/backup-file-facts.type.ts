// What is read from a file that may be restored (opened read only), before deciding about it.
export type BackupFileFacts = {
  // False when SQLite could not read it as a database at all.
  readable: boolean;
  // `PRAGMA integrity_check` answered `ok`.
  integrityOk: boolean;
  tableNames: string[];
  // The names recorded in the `kysely_migration` table of Kysely (empty when there is none).
  migrationNames: string[];
};
