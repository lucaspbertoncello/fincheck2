import type { Kysely } from 'kysely';
import { describe, expect, it, vi } from 'vitest';

import type { Database } from '#/database/database.type.ts';
import { ImportRuleApplier } from '#/modules/sync/application/import/import-rule-applier.service.ts';
import type { SyncRules } from '#/modules/sync/application/import/sync-rules.interface.ts';
import type { SyncTransactions } from '#/modules/sync/application/import/sync-transactions.interface.ts';

const executor = {} as Kysely<Database>;
const resolution: SyncRules.Resolution = {
  ruleId: 'rule-1',
  category: { id: 'category-1', kind: 'expense', isArchived: false },
  tagIds: [],
};

const created = (overrides: Partial<SyncTransactions.Created> = {}): SyncTransactions.Created => ({
  key: 'key',
  transactionId: 'transaction-1',
  accountId: 'account-1',
  nature: 'expense',
  amountCents: -1000,
  occurredOn: '2026-11-05',
  description: 'Mercado',
  counterparty: null,
  categoryId: null,
  ...overrides,
});

const setup = () => {
  const resolve = vi.fn((): SyncRules.Resolution | null => resolution);
  const load = vi.fn(async () => ({ resolve }));
  const applyRules = vi.fn(async (input: { items: SyncTransactions.RuleItem[] }) => ({
    changedCount: input.items.length,
  }));
  const applier = new ImportRuleApplier({ load }, { applyRules } as unknown as SyncTransactions);

  return { applier, load, resolve, applyRules };
};

describe('ImportRuleApplier', () => {
  it('asks the rules for a new transaction with no category, and hands the answer to transactions', async () => {
    const { applier, applyRules } = setup();

    const result = await applier.apply(
      [created()],
      new Map([['transaction-1', 'expense']]),
      executor,
    );

    expect(result.changedCount).toBe(1);
    expect(applyRules).toHaveBeenCalledWith(
      { items: [{ transactionId: 'transaction-1', ...resolution }] },
      executor,
    );
  });

  // A transaction born with a category took the place of a parcel Lucas categorized: his choice
  // stays, and no rule is even asked about it (the rules are not loaded when only these come).
  it('does not ask the rules about a transaction that already has a category (the one that took the place of a parcel Lucas categorized)', async () => {
    const { applier, load, resolve, applyRules } = setup();

    const result = await applier.apply(
      [created({ categoryId: 'category-of-lucas' })],
      new Map([['transaction-1', 'expense']]),
      executor,
    );

    expect(result.changedCount).toBe(0);
    expect(load).not.toHaveBeenCalled();
    expect(resolve).not.toHaveBeenCalled();
    expect(applyRules).not.toHaveBeenCalled();
  });

  it('asks only about the ones with no category when both come', async () => {
    const { applier, resolve } = setup();

    await applier.apply(
      [
        created({ transactionId: 'with-category', categoryId: 'category-of-lucas' }),
        created({ transactionId: 'without-category' }),
      ],
      new Map([
        ['with-category', 'expense'],
        ['without-category', 'expense'],
      ]),
      executor,
    );

    expect(resolve).toHaveBeenCalledTimes(1);
  });

  it.each(['invoice_payment', 'transfer'])(
    'does not ask the rules about a transaction the detectors made a %s',
    async (nature) => {
      const { applier, load } = setup();

      await applier.apply([created()], new Map([['transaction-1', nature]]), executor);

      expect(load).not.toHaveBeenCalled();
    },
  );
});
