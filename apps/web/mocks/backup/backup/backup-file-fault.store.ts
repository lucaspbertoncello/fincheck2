export type BackupFileFault = 'corrupt' | 'not_fincheck' | 'newer_version';

const faults = new Map<string, BackupFileFault>();

// The mock has no real files: a test (or whoever pokes the mock) marks a file of the folder as
// damaged, not a Fincheck database or from a newer version, and `POST /backup/restore` refuses it.
export function markBackupFileFault(fileName: string, fault: BackupFileFault): void {
  faults.set(fileName, fault);
}

export function findBackupFileFault(fileName: string): BackupFileFault | null {
  return faults.get(fileName) ?? null;
}

export function clearBackupFileFaults(): void {
  faults.clear();
}
