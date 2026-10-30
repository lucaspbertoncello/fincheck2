// The last 30 backups stay in the folder.
export const BACKUP_KEEP_COUNT = 30;

// `fincheck-AAAA-MM-DD-HHmmss.db` (São Paulo time). No slash and no `..` can match.
export const BACKUP_FILE_NAME_PATTERN = /^fincheck-\d{4}-\d{2}-\d{2}-\d{6}\.db$/;
