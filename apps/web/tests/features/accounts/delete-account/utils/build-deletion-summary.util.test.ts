import { describe, expect, it } from 'vitest';

import { buildDeletionSummary } from '#/features/accounts/delete-account/utils/build-deletion-summary.util.ts';

const base = {
  transactionCount: 0,
  installmentPlanCount: 0,
  invoiceCount: 0,
  ruleCount: 0,
  isPluggy: false,
  returnsOnNextSync: false,
};

describe('buildDeletionSummary', () => {
  it('lists only what the delete takes with it, in the plural when it must', () => {
    const { gone } = buildDeletionSummary({
      ...base,
      transactionCount: 142,
      invoiceCount: 1,
      ruleCount: 2,
    });

    expect(gone).toEqual([
      '142 transações serão apagadas, inclusive as ignoradas.',
      '1 fatura será apagada.',
      '2 regras de categoria serão apagadas, porque dependem desta conta.',
    ]);
  });

  it('warns that a bank account comes back on the next sync, and suggests archiving', () => {
    const { returnNote } = buildDeletionSummary({
      ...base,
      isPluggy: true,
      returnsOnNextSync: true,
    });

    expect(returnNote).toMatch(/próxima busca/);
    expect(returnNote).toMatch(/arquive/);
  });

  it('says what stays, and has nothing to erase for an account with nothing in it', () => {
    const summary = buildDeletionSummary(base);

    expect(summary.gone).toEqual([]);
    expect(summary.returnNote).toBeNull();
    expect(summary.stays[0]).toMatch(/outras contas/);
  });
});
