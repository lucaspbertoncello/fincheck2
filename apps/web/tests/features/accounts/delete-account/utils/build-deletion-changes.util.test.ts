import { describe, expect, it } from 'vitest';

import { buildDeletionChanges } from '#/features/accounts/delete-account/utils/build-deletion-changes.util.ts';

const base = {
  transactionCount: 0,
  installmentPlanCount: 0,
  invoiceCount: 0,
  ruleCount: 0,
  isPluggy: false,
  returnsOnNextSync: false,
};

describe('buildDeletionChanges', () => {
  it('lists only what the delete takes with it, in the plural when it must', () => {
    const texts = buildDeletionChanges({
      ...base,
      transactionCount: 142,
      invoiceCount: 1,
      ruleCount: 2,
    }).map((change) => change.text);

    expect(texts).toEqual([
      '142 transações serão apagadas, inclusive as ignoradas.',
      '1 fatura será apagada.',
      '2 regras de categoria serão apagadas, porque dependem desta conta.',
    ]);
  });

  it('warns that a bank account comes back on the next sync, and suggests archiving', () => {
    const [change] = buildDeletionChanges({ ...base, isPluggy: true, returnsOnNextSync: true });

    expect(change?.text).toMatch(/próxima busca/);
    expect(change?.text).toMatch(/arquive/);
  });

  it('is empty for an account with nothing in it', () => {
    expect(buildDeletionChanges(base)).toEqual([]);
  });
});
