// The port to a consistent copy of the live database (`VACUUM INTO`, made with the API running,
// WAL included). The adapter lives in `infra/`.
export interface DatabaseSnapshot {
  // Writes the copy to `file`, which must not exist. Throws when it cannot.
  copyTo(file: string): Promise<void>;
}
