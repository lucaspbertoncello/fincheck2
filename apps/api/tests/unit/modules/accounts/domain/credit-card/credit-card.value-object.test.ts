import { describe, expect, it } from 'vitest';

import { CreditCard } from '#/modules/accounts/domain/credit-card/credit-card.value-object.ts';

describe('CreditCard', () => {
  const card = CreditCard.fromRequest({
    brand: 'mastercard',
    last4: '9876',
    closingDay: 3,
    dueDay: 10,
    limitCents: 100000,
    themeId: 'bradesco-black',
  });

  it('is born from the request, with null for what was not sent', () => {
    const bare = CreditCard.fromRequest({ brand: 'elo', closingDay: 31, dueDay: 1 });

    expect(bare).toMatchObject({ last4: null, limit: null, themeId: null });
  });

  it('changes in part and returns a new card', () => {
    const changed = card.change({ dueDay: 15, brand: 'visa' });

    expect(changed).not.toBe(card);
    expect(changed).toMatchObject({ brand: 'visa', last4: '9876', closingDay: 3, dueDay: 15 });
    expect(card.dueDay).toBe(10);
  });

  it('clears last4, the limit and the theme with null, and keeps them when missing', () => {
    expect(card.change({ last4: null, limitCents: null, themeId: null })).toMatchObject({
      last4: null,
      limit: null,
      themeId: null,
    });
    expect(card.change({})).toMatchObject({ last4: '9876', themeId: 'bradesco-black' });
    expect(card.change({}).limit?.cents).toBe(100000);
  });
});
