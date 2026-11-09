import { rename } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';

const BUSY_CODES = new Set(['EBUSY', 'EPERM', 'EACCES']);

// `rename` that tries again a few times when Windows says the file is busy (an antivirus or the
// indexer may hold it for a moment after SQLite closed it).
export async function renameWithRetry(from: string, to: string, attempts = 6): Promise<void> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      await rename(from, to);

      return;
    } catch (error) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
      if (attempt >= attempts || !BUSY_CODES.has(code)) throw error;
      await sleep(100 * attempt);
    }
  }
}
