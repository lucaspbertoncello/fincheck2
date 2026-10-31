import { describe, expect, it } from 'vitest';

import { buildAccountChoices } from '#/shared/utils/build-account-choices.util.ts';

describe('buildAccountChoices', () => {
  it('gives each account the bank mark, or the wallet icon for the wallet', () => {
    expect(
      buildAccountChoices([
        { id: '1', name: 'Nubank', type: 'checking', institutionCode: 'nubank' },
        { id: '2', name: 'Carteira', type: 'wallet', institutionCode: 'wallet' },
        { id: '3', name: 'Roxinho', type: 'credit_card', institutionCode: 'nubank' },
        { id: '4', name: 'Caixinha', type: 'savings', institutionCode: 'other' },
      ]),
    ).toEqual([
      { key: '1', label: 'Nubank', icon: 'wallet', theme: 'nubank' },
      { key: '2', label: 'Carteira', icon: 'coins', theme: 'wallet' },
      { key: '3', label: 'Roxinho', icon: 'card', theme: 'nubank' },
      { key: '4', label: 'Caixinha', icon: 'wallet', theme: 'fallback' },
    ]);
  });
});
