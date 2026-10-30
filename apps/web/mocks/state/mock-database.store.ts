import { buildSeedDatabase } from '#mocks/state/seed/build-seed-database.util.ts';
import { resetMockIds } from '#mocks/state/mock-id.store.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';

// The one in-memory database every handler reads and writes.
export const db: MockState.Database = buildSeedDatabase();

// Back to the seed (the tests do this before each case).
export function resetMockDatabase(): void {
  resetMockIds();
  Object.assign(db, buildSeedDatabase());
}
