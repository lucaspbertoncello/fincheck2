import type { BackupFileFacts } from '#/modules/backup/domain/file/backup-file-facts.type.ts';

// The port that looks inside a file before it is restored. The adapter lives in `infra/`.
export interface BackupFileInspector {
  // Opens the file read only and reads the facts. A file SQLite cannot read is `readable: false`,
  // not an error. Never writes to the file.
  inspect(file: string): Promise<BackupFileFacts>;
}
