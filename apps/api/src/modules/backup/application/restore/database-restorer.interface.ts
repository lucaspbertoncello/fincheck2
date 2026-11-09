// The port to the files of the live database during a restore. The adapter lives in `infra/`.
// The chosen backup never gets near the live database: it is copied next to it (staged), looked at,
// brought up to date, and only then does the swap happen, with the connection closed.
export interface DatabaseRestorer {
  // Copies the backup next to the live database file and returns the path of the copy. A copy that
  // fails leaves nothing behind.
  stage(backupFile: string): Promise<string>;
  // How many rows the live database has changed since it was opened (it only grows). Two equal
  // readings around a safety copy mean nothing was written meanwhile.
  changeCount(): Promise<number>;
  // Makes the live database refuse writes (waiting for the transaction in flight), so nothing can
  // be written after the safety copy and lost in the swap. A write meanwhile fails with an error.
  freezeWrites(): Promise<void>;
  // Lets the live database write again (only if it is open).
  unfreezeWrites(): Promise<void>;
  // False when a swap failed so badly that no database could be put back in place.
  isDatabaseOpen(): boolean;
  // Applies the migrations the staged copy still lacks (it may come from an older version).
  migrate(stagedFile: string): Promise<void>;
  // Removes the staged copy (and the files SQLite made for it); absent is not an error.
  discard(stagedFile: string): Promise<void>;
  // Closes the live database, puts the staged copy in its place and opens it again. Every other
  // query waits meanwhile. If it cannot, the live database is back as it was and this throws.
  replaceWith(stagedFile: string): Promise<void>;
  // Gives the old database that a failed swap left aside a name nothing deletes; returns its path,
  // or null when there is none.
  preserveReplaced(): Promise<string | null>;
}
