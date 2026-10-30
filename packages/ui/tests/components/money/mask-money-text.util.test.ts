import { describe, expect, it } from 'vitest';

import { maskMoneyText } from '#/components/money/mask-money-text.util.ts';

describe('maskMoneyText', () => {
  it('turns every digit into a dot and keeps the rest of the shape', () => {
    expect(maskMoneyText('R$ 1.234,56')).toBe('R$ •.•••,••');
    expect(maskMoneyText('R$ 0,05')).toBe('R$ •,••');
  });

  it('keeps the length of the text', () => {
    expect(maskMoneyText('R$ 987.654,32')).toHaveLength('R$ 987.654,32'.length);
  });
});
