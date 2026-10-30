import { beforeEach } from 'vitest';

import { resetMockDatabase } from '#mocks/state/mock-database.store.ts';

// Each case starts from the seed: the mocks keep their state in memory between requests.
export function resetDatabaseBeforeEach(): void {
  beforeEach(() => {
    resetMockDatabase();
  });
}
