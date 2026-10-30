/** One backup of the folder, ready to draw in the restore dialog. */
export type BackupFileItem = {
  fileName: string;
  /** "21/10 às 03:00 · 14,2 MB". */
  label: string;
  /** "21/10", for the title of the confirmation. */
  day: string;
};
