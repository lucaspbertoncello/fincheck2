import type { BackupFileFacts } from '#/modules/backup/domain/file/backup-file-facts.type.ts';
import type { BackupFileInvalidReason } from '#/modules/backup/domain/file/backup-file-invalid.error.ts';
import { FINCHECK_CORE_TABLES } from '#/modules/backup/domain/file/fincheck-core-tables.constant.ts';

// Why a file cannot be restored, or null when it can (BR-BKP-002). In this order: damaged, not a
// Fincheck database, from a newer version. A newer version is a file that records a migration this
// app does not know; a file that records fewer is older and gets migrated when restored.
export function assessBackupFile(
  facts: BackupFileFacts,
  knownMigrationNames: string[],
): BackupFileInvalidReason | null {
  if (!facts.readable || !facts.integrityOk) return 'corrupt';

  const tables = new Set(facts.tableNames);
  if (!FINCHECK_CORE_TABLES.every((table) => tables.has(table))) return 'not_fincheck';

  const known = new Set(knownMigrationNames);
  if (facts.migrationNames.some((name) => !known.has(name))) return 'newer_version';

  return null;
}
