const MINUTE_LENGTH = 'AAAA-MM-DDTHH:MM'.length;

/** True when another backup of the list was made in the same minute as this one (UTC minute, as sent). */
export function hasSharedMinute(
  file: { fileName: string; createdAt: string },
  files: readonly { fileName: string; createdAt: string }[],
): boolean {
  const minute = file.createdAt.slice(0, MINUTE_LENGTH);

  return files.some(
    (other) =>
      other.fileName !== file.fileName && other.createdAt.slice(0, MINUTE_LENGTH) === minute,
  );
}
