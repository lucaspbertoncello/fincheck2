import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import { invalidateCatalog } from '#/domain/cache/catalog/services/invalidate-catalog.service.ts';
import { invalidateLedger } from '#/domain/cache/ledger/services/invalidate-ledger.service.ts';

function seededClient() {
  const client = new QueryClient();
  for (const key of [
    ['transactions', 'list'],
    ['accounts', 'list'],
    ['invoices', 'open'],
    ['recurrences', 'list'],
    ['bills', 'list'],
    ['dashboard', 'free-balance'],
    ['dashboard', 'agenda', '2026-10'],
    ['categories', 'rule-suggestions', 'a,b'],
    ['categories', 'categories', {}],
    ['sync', 'connections'],
    ['backup', 'status'],
  ]) {
    client.setQueryData(key, 1);
  }

  return client;
}

const stale = (client: QueryClient) =>
  client
    .getQueryCache()
    .getAll()
    .filter((query) => query.state.isInvalidated)
    .map((query) => `${String(query.queryKey[0])}/${String(query.queryKey[1])}`)
    .sort();

describe('cache invalidation', () => {
  it('the ledger marks stale what shows money and links, nothing else', async () => {
    const client = seededClient();

    await invalidateLedger(client);

    expect(stale(client)).toEqual([
      'accounts/list',
      'bills/list',
      'categories/rule-suggestions',
      'dashboard/agenda',
      'dashboard/free-balance',
      'invoices/open',
      'recurrences/list',
      'transactions/list',
    ]);
  });

  it('the catalog marks the categories, transactions and the dashboard', async () => {
    const client = seededClient();

    await invalidateCatalog(client);

    expect(stale(client)).toEqual([
      'categories/categories',
      'categories/rule-suggestions',
      'dashboard/agenda',
      'dashboard/free-balance',
      'transactions/list',
    ]);
  });
});
