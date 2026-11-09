import { existsSync, readdirSync, renameSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';

// A restore moves the live database to `<file>.replaced` and puts the restored one in its place. If
// the process died between the two moves, or the swap failed twice, there is no database file, and
// opening the path would create an empty one. This puts the old database back before anything opens
// the path: `<file>.replaced`, or else the newest `<file>.preserved-*` (the name a failed swap gives
// the old database so that nothing deletes it). Returns whether it did. With the file in place it
// does nothing (a `.replaced` left beside it is only a leftover of a swap that finished).
export function recoverInterruptedSwap(file: string): boolean {
  if (existsSync(file)) return false;

  const replaced = `${file}.replaced`;
  if (existsSync(replaced)) {
    renameSync(replaced, file);

    return true;
  }

  if (!existsSync(dirname(file))) return false;
  const prefix = `${basename(file)}.preserved-`;
  const newest = readdirSync(dirname(file))
    .filter((name) => name.startsWith(prefix) && !name.endsWith('-wal') && !name.endsWith('-shm'))
    .sort()
    .pop();
  if (newest === undefined) return false;
  renameSync(join(dirname(file), newest), file);

  return true;
}
