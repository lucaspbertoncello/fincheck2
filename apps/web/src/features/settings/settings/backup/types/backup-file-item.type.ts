/** One backup of the folder, ready to draw in the list. */
export type BackupFileItem = {
  fileName: string;
  /** "Ontem às 03:00". */
  moment: string;
  /** "14,2 MB". */
  size: string;
  /** "21/10", for the title of the confirmation. */
  day: string;
  isLatest: boolean;
};
