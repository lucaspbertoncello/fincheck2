// The port to the size of the database. The adapter lives in `infra/`.
export interface DatabaseSizeReader {
  // Bytes of the database now: pages times page size, what a backup made at this moment would weigh.
  readBytes(): Promise<number>;
}
