import { describe, expect, it } from 'vitest';

import { buildAccountChoices } from '#/features/transactions/transaction-fields/utils/build-account-choices.util.ts';

describe('buildAccountChoices', () => {
  it('gives each account the icon of its kind', () => {
    expect(
      buildAccountChoices([
        { id: '1', name: 'Nubank', type: 'checking' },
        { id: '2', name: 'Carteira', type: 'wallet' },
        { id: '3', name: 'Roxinho', type: 'credit_card' },
      ]),
    ).toEqual([
      { key: '1', label: 'Nubank', icon: 'wallet' },
      { key: '2', label: 'Carteira', icon: 'coins' },
      { key: '3', label: 'Roxinho', icon: 'card' },
    ]);
  });
});
