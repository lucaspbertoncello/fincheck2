import type { ReplaceableDatabase } from '#/database/replaceable/replaceable-database.client.ts';
import { createAppParts } from '#/main/http/create-app-parts.util.ts';
import type { Clock } from '#/shared/clock/clock.interface.ts';
import { SystemClock } from '#/shared/clock/system-clock.service.ts';

// The HTTP app: every module built and mounted (`createAppParts`). `clock` is the real one; a test
// passes a fixed one. The type of what it returns is the one the typed client of the web uses.
export function createApp({
  db,
  localToken,
  clock = new SystemClock(),
}: {
  db: ReplaceableDatabase;
  localToken: string;
  clock?: Clock;
}) {
  return createAppParts({ db, localToken, clock }).app;
}
