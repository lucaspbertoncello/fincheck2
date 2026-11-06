import { addDays } from '#mocks/support/dates/add-days.util.ts';
import { TODAY } from '#mocks/support/dates/mock-clock.store.ts';
import { toInstant } from '#mocks/support/dates/to-instant.util.ts';
import type { MockState } from '#mocks/state/mock-state.type.ts';
import { buildSeedIds } from '#mocks/state/seed/build-seed-ids.util.ts';
import { seedAccounts } from '#mocks/state/seed/seed-accounts.util.ts';
import { seedBillsAndRules } from '#mocks/state/seed/seed-bills-and-rules.util.ts';
import { seedCatalog } from '#mocks/state/seed/seed-catalog.util.ts';
import { seedInvoiceShowcase } from '#mocks/state/seed/seed-invoice-showcase.util.ts';
import { seedSpendHistory } from '#mocks/state/seed/seed-spend-history.util.ts';
import { seedSubscriptions } from '#mocks/state/seed/seed-subscriptions.util.ts';
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
    subscriptionDismissals: [],
    connections: [],
    runs: [],
    syncSettings: null,
    backup: { folderPath: null, files: [], running: false, lastError: null },
    profile: {
      name: 'Davi Moreira',
      initials: 'DM',
      avatarId: null,
      updatedAt: toInstant(addDays(TODAY, -30)),
    },
  };
  const ids = buildSeedIds();

  seedCatalog(database, ids);
  seedAccounts(database, ids);
  // Recurrences first: their transactions belong to the invoices that seedTransactions pays.
  seedRecurrences(database, ids);
  seedTransactions(database, ids);
  seedBillsAndRules(database, ids);
  // Last, so the ids of everything above stay the same.
  seedSpendHistory(database, ids);
  seedSubscriptions(database, ids);
  seedInvoiceShowcase(database, ids);

  return database;
}
