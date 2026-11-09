import type { BackupFolderInvalidReason } from '#mocks/backup/backup/backup-folder-invalid-reason.type.ts';

// The mock has no disk, so the name of the path tells what the folder would be: one that says it
// does not exist is not found, one that ends in a file name (an extension) is not a folder, and one
// that says it is read only cannot be written. Anything else is a usable folder.
export function inspectFolder(folderPath: string): BackupFolderInvalidReason | null {
  if (/inexistente|naoexiste/i.test(folderPath)) return 'not_found';
  if (/\.[A-Za-z0-9]{1,5}$/.test(folderPath)) return 'not_a_folder';
  if (/somente-?leitura|readonly|negado/i.test(folderPath)) return 'not_writable';

  return null;
}
