import { describe, expect, it } from 'vitest';

import { buildTransactionMenuItems } from '#/components/transactions/row/build-transaction-menu-items.util.ts';

const keys = (input: Parameters<typeof buildTransactionMenuItems>[0]) =>
  buildTransactionMenuItems(input).map((item) => item.key);

describe('buildTransactionMenuItems', () => {
  it('offers "Criar recorrência" by default', () => {
    expect(keys({})).toContain('create-recurrence');
    expect(keys({ ignored: true })).toContain('create-recurrence');
  });

  it('leaves it out when the transaction is already linked to a recurrence', () => {
    expect(keys({ recurring: true })).not.toContain('create-recurrence');
    expect(keys({ recurring: true, ignored: true })).not.toContain('create-recurrence');
    expect(keys({ recurring: true })).toContain('create-rule');
  });
});
