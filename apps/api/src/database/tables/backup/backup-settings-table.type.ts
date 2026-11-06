export interface BackupSettingsTable {
  id: 1;
  folder_path: string;
  last_error_at: string | null;
  last_error_code: string | null;
  updated_at: string;
}
