// The port to the folder of backups on the disk. The adapter lives in `infra/`.
export interface BackupFolder {
  // The files of the folder whose name follows the pattern of a backup, with their size; the rest
  // of the folder is ignored. Throws `BackupFolderInvalidError` when the folder does not open.
  listBackups(folder: string): Promise<BackupFolder.Entry[]>;
  // Throws `BackupFolderInvalidError` (with the reason) unless the folder exists, is a folder and
  // the API can write in it.
  assertUsable(folder: string): Promise<void>;
  rename(folder: string, from: string, to: string): Promise<void>;
  // Removes a file of the folder; absent is not an error.
  remove(folder: string, fileName: string): Promise<void>;
}

export namespace BackupFolder {
  export type Entry = { fileName: string; sizeBytes: number };
}
