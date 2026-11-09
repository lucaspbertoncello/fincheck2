import { describe, expect, it } from 'vitest';

import { translatePluggyCardBrand } from '#/modules/sync/infra/pluggy/translate-pluggy-card-brand.util.ts';

describe('translatePluggyCardBrand', () => {
  it.each([
    ['VISA', 'visa'],
    ['visa', 'visa'],
    ['MASTERCARD', 'mastercard'],
    ['Master Card', 'mastercard'],
    ['ELO', 'elo'],
    ['AMEX', 'amex'],
    ['American Express', 'amex'],
    ['HIPERCARD', 'hipercard'],
    ['Diners', 'other'],
    ['', 'other'],
    [null, 'other'],
    [undefined, 'other'],
  ])('%s is %s', (brand, expected) => {
    expect(translatePluggyCardBrand(brand)).toBe(expected);
  });
});
