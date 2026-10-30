import type { MockState } from '#mocks/state/mock-state.type.ts';
import { buildSeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { seedAccounts } from '#mocks/state/seed/seed-accounts.util.ts';
import { seedBillsAndRules } from '#mocks/state/seed/seed-bills-and-rules.util.ts';
import { seedCatalog } from '#mocks/state/seed/seed-catalog.util.ts';
import { seedRecurrences } from '#mocks/state/seed/seed-recurrences.util.ts';
import { seedTransactions } from '#mocks/state/seed/seed-transactions.util.ts';

// The made-up data the mock server starts with. Every date is relative to today.
export function buildSeedDatabase(): MockState.Database {
  const database: MockState.Database = {
    accounts: [],
    transactions: [],
    installmentPlans: [],
    invoices: [],
    recurrences: [],
    occurrences: [],
    bills: [],
    categories: [],
    tags: [],
    rules: [],
    ruleSuggestionDecisions: [],
    connections: [],
    runs: [],
    syncSettings: null,
    backup: { folderPath: null, files: [], running: false, lastError: null },
  };
  const ids = buildSeedIds();

  seedCatalog(database, ids);
  seedAccounts(database, ids);
  // Recurrences first: their transactions belong to the invoices that seedTransactions pays.
  seedRecurrences(database, ids);
  seedTransactions(database, ids);
  seedBillsAndRules(database, ids);

  return database;
}
