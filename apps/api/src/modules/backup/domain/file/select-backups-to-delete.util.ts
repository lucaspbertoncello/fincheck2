import { BackupFileName } from '#/modules/backup/domain/file/backup-file-name.value-object.ts';

// The names that go out when only the `keepCount` newest stay (BR-BKP-001). The newest is the one
// with the latest instant in its name; names that do not follow the pattern are never selected.
// `protectedName` (the file just written) is never selected, even when its name is old for the clock
// (a clock that was wrong once leaves files dated in the future that would push it out).
export function selectBackupsToDelete(
  fileNames: string[],
  keepCount: number,
  protectedName?: string,
): string[] {
  const names = fileNames
    .map((fileName) => BackupFileName.parse(fileName))
    .filter((name): name is BackupFileName => name !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.value.localeCompare(a.value));

  return names
    .slice(keepCount)
    .map((name) => name.value)
    .filter((name) => name !== protectedName);
}
