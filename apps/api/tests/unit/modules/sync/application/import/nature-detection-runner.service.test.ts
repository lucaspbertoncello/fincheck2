import type { Kysely } from 'kysely';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import type { SyncInvoices } from '#/modules/sync/application/import/sync-invoices.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';
import { NatureDetectionRunner } from '#/modules/sync/application/import/nature-detection-runner.service.ts';

const executor = {} as Kysely<Database>;

const row = (overrides: Partial<SyncTransactions.PoolRow>): SyncTransactions.PoolRow => ({
  transactionId: 'row',
  accountId: 'checking',
  isCard: false,
  amountCents: -30000,
  occurredOn: '2026-11-03',
  description: 'Pix',
  nature: 'expense',
  natureSetBy: 'system',
  hasUserCategory: false,
  isSplit: false,
  isLinked: false,
  transferCounterpartId: null,
  ...overrides,
});

const created = (transactionId: string, accountId: string): SyncTransactions.Created => ({
  key: transactionId,
  transactionId,
  accountId,
  nature: 'expense',
  amountCents: 0,
  occurredOn: '2026-11-03',
  description: '',
  counterparty: null,
  categoryId: null,
});

describe('NatureDetectionRunner', () => {
  // The order of 4.10: payment of invoice first, transfer after, and what the first one took is
  // never a leg of the second. The pool is read before anything is written, so the debit still
  // looks like a plain expense to the transfer detector: only what the runner leaves out stops it.
  it('hands the transfer detector what the payment detector took as excluded: a debit that pays an invoice is not also a leg of a transfer', async () => {
    const pool = [
      row({
        transactionId: 'card-credit',
        accountId: 'card',
        isCard: true,
        amountCents: 30000,
        nature: 'income',
        description: 'PAGAMENTO RECEBIDO',
      }),
      row({ transactionId: 'checking-debit', description: 'Pagamento fatura' }),
      row({
        transactionId: 'savings-credit',
        accountId: 'savings',
        amountCents: 30000,
        nature: 'income',
        description: 'Pix recebido',
      }),
    ];
    const applyDetectedNatures = vi.fn(async () => ({ payments: [], transfers: [] }));
    const runner = new NatureDetectionRunner(
      {
        listDetectionPool: async () => pool,
        applyDetectedNatures,
      } as unknown as SyncTransactions,
      { listPayable: async () => [] } as unknown as SyncInvoices,
    );

    await runner.run(
      [
        created('card-credit', 'card'),
        created('checking-debit', 'checking'),
        created('savings-credit', 'savings'),
      ],
      executor,
    );

    const [call] = applyDetectedNatures.mock.calls as unknown as [
      [{ payments: string[]; transfers: unknown[] }],
    ];
    expect(call[0].payments.toSorted()).toEqual(['card-credit', 'checking-debit']);
    expect(call[0].transfers).toEqual([]);
  });

  it('a transfer between two accounts with no card involved is still found', async () => {
    const pool = [
      row({ transactionId: 'out', description: 'Para poupança' }),
      row({
        transactionId: 'in',
        accountId: 'savings',
        amountCents: 30000,
        nature: 'income',
        description: 'Da corrente',
      }),
    ];
    const applyDetectedNatures = vi.fn(async () => ({ payments: [], transfers: [] }));
    const runner = new NatureDetectionRunner(
      {
        listDetectionPool: async () => pool,
        applyDetectedNatures,
      } as unknown as SyncTransactions,
      { listPayable: async () => [] } as unknown as SyncInvoices,
    );

    await runner.run([created('out', 'checking'), created('in', 'savings')], executor);

    const [call] = applyDetectedNatures.mock.calls as unknown as [
      [{ payments: string[]; transfers: unknown[] }],
    ];
    expect(call[0].payments).toEqual([]);
    expect(call[0].transfers).toEqual([{ firstId: 'out', secondId: 'in' }]);
  });
});
